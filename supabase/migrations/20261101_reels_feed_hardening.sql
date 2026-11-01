-- Reels feed hardening and persisted saves.
-- Idempotent: safe to run more than once.
-- This migration only affects reel engagement support; it does not seed or delete posts.

alter table public.posts add column if not exists sound_title text;
alter table public.posts add column if not exists duration_seconds integer;
alter table public.posts add column if not exists view_count integer not null default 0;
alter table public.posts add column if not exists like_count integer not null default 0;
alter table public.posts add column if not exists comment_count integer not null default 0;

create index if not exists idx_posts_reels_recent
  on public.posts (created_at desc)
  where media_type = 'reel';

create index if not exists idx_posts_reels_visibility_recent
  on public.posts (visibility, created_at desc)
  where media_type = 'reel';

create table if not exists public.reel_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  reel_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, reel_id)
);

alter table public.reel_saves enable row level security;
drop policy if exists "Users read own reel saves" on public.reel_saves;
create policy "Users read own reel saves"
  on public.reel_saves for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users save reels for themselves" on public.reel_saves;
create policy "Users save reels for themselves"
  on public.reel_saves for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = reel_id and p.media_type = 'reel'
        and (
          p.visibility = 'public'
          or p.author_id = (select auth.uid())
          or (p.visibility = 'followers' and exists (
            select 1 from public.follows f
            where f.follower_id = (select auth.uid()) and f.followed_id = p.author_id
          ))
          or (p.visibility = 'church' and exists (
            select 1 from public.church_members cm
            where cm.user_id = (select auth.uid())
              and cm.church_id = p.church_id::text and cm.status = 'active'
          ))
        )
    )
  );

drop policy if exists "Users unsave own reels" on public.reel_saves;
create policy "Users unsave own reels"
  on public.reel_saves for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.reel_saves to authenticated;

-- One counted view per signed-in viewer/reel/day prevents repeated autoplay callbacks
-- from inflating view counts. No direct table access is granted to clients.
create table if not exists public.reel_view_events (
  reel_id uuid not null references public.posts(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  view_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (reel_id, viewer_id, view_date)
);
alter table public.reel_view_events enable row level security;
revoke all on public.reel_view_events from anon, authenticated;

create or replace function public.record_reel_view(p_reel_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer := 0;
  v_inserted integer := 0;
begin
  if v_user_id is null then
    return 0;
  end if;

  if not exists (
    select 1 from public.posts p
    where p.id = p_reel_id and p.media_type = 'reel'
      and (
        p.visibility = 'public'
        or p.author_id = v_user_id
        or (p.visibility = 'followers' and exists (
          select 1 from public.follows f
          where f.follower_id = v_user_id and f.followed_id = p.author_id
        ))
        or (p.visibility = 'church' and exists (
          select 1 from public.church_members cm
          where cm.user_id = v_user_id
            and cm.church_id = p.church_id::text and cm.status = 'active'
        ))
      )
  ) then
    return 0;
  end if;

  insert into public.reel_view_events (reel_id, viewer_id, view_date)
  values (p_reel_id, v_user_id, current_date)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.posts
      set view_count = coalesce(view_count, 0) + 1
      where id = p_reel_id and media_type = 'reel'
      returning view_count into v_count;
  else
    select coalesce(p.view_count, 0) into v_count
      from public.posts p where p.id = p_reel_id;
  end if;

  return coalesce(v_count, 0);
end;
$$;
revoke all on function public.record_reel_view(uuid) from public, anon;
grant execute on function public.record_reel_view(uuid) to authenticated;

create or replace function public.toggle_reel_like(p_reel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing boolean;
  v_inserted integer := 0;
  v_liked boolean := false;
  v_like_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required to like reels';
  end if;

  if not exists (
    select 1 from public.posts p
    where p.id = p_reel_id and p.media_type = 'reel'
      and (
        p.visibility = 'public'
        or p.author_id = v_user_id
        or (p.visibility = 'followers' and exists (
          select 1 from public.follows f
          where f.follower_id = v_user_id and f.followed_id = p.author_id
        ))
        or (p.visibility = 'church' and exists (
          select 1 from public.church_members cm
          where cm.user_id = v_user_id
            and cm.church_id = p.church_id::text and cm.status = 'active'
        ))
      )
  ) then
    raise exception 'Reel not found or not visible to this user';
  end if;

  select exists (
    select 1 from public.reactions r
    where r.target_id = p_reel_id::text
      and r.user_id = v_user_id
      and r.target_type = 'post'
  ) into v_existing;

  if v_existing then
    delete from public.reactions r
      where r.target_id = p_reel_id::text
        and r.user_id = v_user_id
        and r.target_type = 'post';
    update public.posts
      set like_count = greatest(0, coalesce(like_count, 0) - 1)
      where id = p_reel_id
      returning like_count into v_like_count;
    v_liked := false;
  else
    insert into public.reactions (target_id, target_type, user_id, emoji, created_at)
    values (p_reel_id::text, 'post', v_user_id, '❤️', now())
    on conflict do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      update public.posts
        set like_count = coalesce(like_count, 0) + 1
        where id = p_reel_id
        returning like_count into v_like_count;
      v_liked := true;
    else
      select coalesce(p.like_count, 0) into v_like_count
        from public.posts p where p.id = p_reel_id;
      v_liked := true;
    end if;
  end if;

  return jsonb_build_object(
    'reel_id', p_reel_id,
    'liked', v_liked,
    'like_count', coalesce(v_like_count, 0)
  );
end;
$$;
revoke all on function public.toggle_reel_like(uuid) from public, anon;
grant execute on function public.toggle_reel_like(uuid) to authenticated;

-- Both feeds enforce the same visibility rules before returning reel rows.
create or replace function public.for_you_reels(p_limit integer default 15, p_offset integer default 0)
returns table (
  id uuid, author_id uuid, church_id uuid, category_id text, text_content text,
  media_url text, media_type text, media_duration_seconds integer, media_thumbnail_url text,
  sound_title text, view_count integer, like_count integer, comment_count integer,
  duration_seconds integer, visibility text, created_at timestamptz, is_following boolean
)
language sql
stable
set search_path = public
as $$
  select p.id, p.author_id, p.church_id, p.category_id, p.text_content,
    p.media_url, p.media_type, p.media_duration_seconds,
    p.media_thumbnail_url, coalesce(p.sound_title, 'Original Sound'),
    coalesce(p.view_count, 0), coalesce(p.like_count, 0), coalesce(p.comment_count, 0),
    coalesce(p.duration_seconds, p.media_duration_seconds, 0), p.visibility, p.created_at,
    exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = p.author_id)
  from public.posts p
  where p.media_type = 'reel'
    and (
      p.visibility = 'public'
      or p.author_id = auth.uid()
      or (p.visibility = 'followers' and exists (
        select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = p.author_id
      ))
      or (p.visibility = 'church' and exists (
        select 1 from public.church_members cm
        where cm.user_id = auth.uid() and cm.church_id = p.church_id::text and cm.status = 'active'
      ))
    )
  order by (
    (coalesce(p.like_count, 0) * 3.5) +
    (coalesce(p.comment_count, 0) * 4.0) +
    (coalesce(p.view_count, 0) * 0.4) +
    case when exists (
      select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = p.author_id
    ) then 50.0 else 0.0 end
  ) / power(greatest(1.0, extract(epoch from (now() - p.created_at)) / 3600.0 + 2.0), 1.25) desc,
  p.created_at desc
  limit least(greatest(coalesce(p_limit, 15), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.following_reels(p_limit integer default 15, p_offset integer default 0)
returns table (
  id uuid, author_id uuid, church_id uuid, category_id text, text_content text,
  media_url text, media_type text, media_duration_seconds integer, media_thumbnail_url text,
  sound_title text, view_count integer, like_count integer, comment_count integer,
  duration_seconds integer, visibility text, created_at timestamptz, is_following boolean
)
language sql
stable
set search_path = public
as $$
  select p.id, p.author_id, p.church_id, p.category_id, p.text_content,
    p.media_url, p.media_type, p.media_duration_seconds,
    p.media_thumbnail_url, coalesce(p.sound_title, 'Original Sound'),
    coalesce(p.view_count, 0), coalesce(p.like_count, 0), coalesce(p.comment_count, 0),
    coalesce(p.duration_seconds, p.media_duration_seconds, 0), p.visibility, p.created_at, true
  from public.posts p
  where p.media_type = 'reel'
    and (
      p.author_id = auth.uid()
      or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = p.author_id)
    )
    and (
      p.visibility = 'public'
      or p.author_id = auth.uid()
      or (p.visibility = 'followers' and exists (
        select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = p.author_id
      ))
      or (p.visibility = 'church' and exists (
        select 1 from public.church_members cm
        where cm.user_id = auth.uid() and cm.church_id = p.church_id::text and cm.status = 'active'
      ))
    )
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 15), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.for_you_reels(integer, integer) from public;
revoke all on function public.following_reels(integer, integer) from public;
grant execute on function public.for_you_reels(integer, integer) to anon, authenticated;
grant execute on function public.following_reels(integer, integer) to authenticated;

-- Verification (optional):
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'posts'
--   and column_name in ('sound_title','duration_seconds','view_count','like_count','comment_count');
-- select policyname from pg_policies where schemaname='public' and tablename='reel_saves';
