-- Media foundation follow-up: comment storage, visibility-policy cleanup, and safe counters.
-- Idempotent by design. Review and run manually in Supabase SQL Editor after backup.

create table if not exists public.media_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.media_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid null references public.media_comments(id) on delete cascade,
  body text not null default '',
  media_url text null,
  media_type text null,
  created_at timestamptz not null default now(),
  constraint media_comments_body_length check (char_length(body) <= 2000),
  constraint media_comments_media_type_check check (
    media_type is null or media_type in ('image', 'video', 'audio', 'gif')
  ),
  constraint media_comments_body_or_media check (
    length(trim(body)) > 0 or media_url is not null
  )
);

create index if not exists idx_media_comments_item_created
  on public.media_comments (item_id, created_at, id);
create index if not exists idx_media_comments_user_created
  on public.media_comments (user_id, created_at desc);
create index if not exists idx_media_comments_parent
  on public.media_comments (parent_id) where parent_id is not null;

alter table public.media_comments enable row level security;

drop policy if exists "Read comments for published media" on public.media_comments;
create policy "Read comments for published media"
  on public.media_comments for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.media_items m
      where m.id = media_comments.item_id
        and m.status = 'published'
    )
    or user_id = (select auth.uid())
  );

drop policy if exists "Signed-in users add own media comments" on public.media_comments;
create policy "Signed-in users add own media comments"
  on public.media_comments for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.media_items m
      where m.id = media_comments.item_id
        and m.status = 'published'
    )
  );

drop policy if exists "Authors update own media comments" on public.media_comments;
create policy "Authors update own media comments"
  on public.media_comments for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Authors delete own media comments" on public.media_comments;
create policy "Authors delete own media comments"
  on public.media_comments for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.media_comments to anon, authenticated;
grant insert, update, delete on public.media_comments to authenticated;

-- Keep media visibility policies effective: older broad permissive policies
-- were OR-ed with the intended visibility-aware policies and exposed private rows.
drop policy if exists "Public media items are readable by all" on public.media_items;
drop policy if exists "Authors can update own media items" on public.media_items;
drop policy if exists "Playlist items readable by anyone who can see playlist" on public.playlist_items;

-- View events are written through record_media_view so clients cannot insert
-- arbitrary rows directly. Anonymous users do not get to read view-event logs.
drop policy if exists "Insert media views" on public.media_views;
drop policy if exists "Read own media views" on public.media_views;
drop policy if exists "Authenticated users read own media views" on public.media_views;
create policy "Authenticated users read own media views"
  on public.media_views for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Maintain media_items.comment_count for the new dedicated media-comments table.
create or replace function public.sync_media_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
begin
  if tg_op = 'DELETE' then
    v_item_id := old.item_id;
  else
    v_item_id := new.item_id;
  end if;

  update public.media_items
    set comment_count = (
      select count(*)::integer
      from public.media_comments c
      where c.item_id = v_item_id
    )
    where id = v_item_id;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.sync_media_comment_count() from public, anon, authenticated;
drop trigger if exists trg_sync_media_comment_count on public.media_comments;
create trigger trg_sync_media_comment_count
  after insert or delete on public.media_comments
  for each row execute function public.sync_media_comment_count();

-- Correct daily view deduplication: ON CONFLICT DO UPDATE ... RETURNING had
-- reported a row even on conflict, which could increment view_count repeatedly.
create or replace function public.record_media_view(
  p_item_id uuid,
  p_watched_seconds integer default 0,
  p_viewer_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text;
  v_view_id uuid;
  v_new_count integer;
begin
  if p_item_id is null then
    raise exception 'Media item ID is required';
  end if;

  if not exists (
    select 1
    from public.media_items m
    where m.id = p_item_id
      and m.status = 'published'
      and (
        m.visibility = 'public'
        or m.author_id = v_user_id
        or (
          m.visibility = 'followers'
          and v_user_id is not null
          and public.is_following_user(v_user_id, m.author_id)
        )
        or (
          m.visibility = 'church'
          and v_user_id is not null
          and m.church_id is not null
          and public.is_active_church_member(v_user_id, m.church_id)
        )
      )
  ) then
    raise exception 'Media item not found or not visible';
  end if;

  v_key := left(coalesce(
    nullif(trim(p_viewer_key), ''),
    case when v_user_id is not null then v_user_id::text
         else 'anon-' || md5(clock_timestamp()::text || random()::text) end
  ), 160);

  insert into public.media_views (item_id, user_id, viewer_key, watched_seconds, view_date)
  values (p_item_id, v_user_id, v_key, greatest(0, least(coalesce(p_watched_seconds, 0), 2147483647)), current_date)
  on conflict (item_id, viewer_key, view_date) do nothing
  returning id into v_view_id;

  if v_view_id is not null then
    update public.media_items
      set view_count = view_count + 1
      where id = p_item_id
      returning view_count into v_new_count;
  else
    update public.media_views
      set watched_seconds = greatest(watched_seconds, greatest(0, coalesce(p_watched_seconds, 0)))
      where item_id = p_item_id and viewer_key = v_key and view_date = current_date;

    select view_count into v_new_count
      from public.media_items
      where id = p_item_id;
  end if;

  return jsonb_build_object(
    'item_id', p_item_id,
    'view_counted', v_view_id is not null,
    'view_count', coalesce(v_new_count, 0)
  );
end;
$$;

-- Likes and saves run as SECURITY DEFINER to update counters atomically, so
-- validate visibility here instead of relying on caller-side RLS.
create or replace function public.toggle_media_like(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_liked boolean;
  v_like_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required to like media';
  end if;

  if not exists (
    select 1
    from public.media_items m
    where m.id = p_item_id
      and m.status = 'published'
      and (
        m.visibility = 'public'
        or m.author_id = v_user_id
        or (m.visibility = 'followers' and public.is_following_user(v_user_id, m.author_id))
        or (m.visibility = 'church' and m.church_id is not null
            and public.is_active_church_member(v_user_id, m.church_id))
      )
  ) then
    raise exception 'Media item not found or not visible';
  end if;

  insert into public.media_engagement (user_id, item_id, liked, updated_at)
  values (v_user_id, p_item_id, true, now())
  on conflict (user_id, item_id)
  do update set liked = not public.media_engagement.liked, updated_at = now()
  returning liked into v_new_liked;

  if v_new_liked then
    update public.media_items set like_count = like_count + 1
      where id = p_item_id returning like_count into v_like_count;
  else
    update public.media_items set like_count = greatest(0, like_count - 1)
      where id = p_item_id returning like_count into v_like_count;
  end if;

  return jsonb_build_object('item_id', p_item_id, 'liked', v_new_liked, 'like_count', coalesce(v_like_count, 0));
end;
$$;

create or replace function public.toggle_media_save(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_saved boolean;
  v_save_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required to save media';
  end if;

  if not exists (
    select 1
    from public.media_items m
    where m.id = p_item_id
      and m.status = 'published'
      and (
        m.visibility = 'public'
        or m.author_id = v_user_id
        or (m.visibility = 'followers' and public.is_following_user(v_user_id, m.author_id))
        or (m.visibility = 'church' and m.church_id is not null
            and public.is_active_church_member(v_user_id, m.church_id))
      )
  ) then
    raise exception 'Media item not found or not visible';
  end if;

  insert into public.media_engagement (user_id, item_id, saved, updated_at)
  values (v_user_id, p_item_id, true, now())
  on conflict (user_id, item_id)
  do update set saved = not public.media_engagement.saved, updated_at = now()
  returning saved into v_new_saved;

  if v_new_saved then
    update public.media_items set save_count = save_count + 1
      where id = p_item_id returning save_count into v_save_count;
  else
    update public.media_items set save_count = greatest(0, save_count - 1)
      where id = p_item_id returning save_count into v_save_count;
  end if;

  return jsonb_build_object('item_id', p_item_id, 'saved', v_new_saved, 'save_count', coalesce(v_save_count, 0));
end;
$$;

-- Explicit RPC grants: view recording is intentionally available to guests;
-- likes and saves require a real signed-in user (enforced inside each function).
revoke all on function public.record_media_view(uuid, integer, text) from public;
grant execute on function public.record_media_view(uuid, integer, text) to anon, authenticated;
revoke all on function public.toggle_media_like(uuid) from public, anon;
grant execute on function public.toggle_media_like(uuid) to authenticated;
revoke all on function public.toggle_media_save(uuid) from public, anon;
grant execute on function public.toggle_media_save(uuid) to authenticated;
grant execute on function public.search_media(text, text, text, integer, integer) to anon, authenticated;
grant execute on function public.trending_media(text, integer, integer) to anon, authenticated;

-- Verification query (run after applying):
-- select to_regclass('public.media_comments') as media_comments_table,
--        (select count(*) from pg_policies where schemaname='public'
--         and tablename='media_comments') as media_comments_policy_count;
