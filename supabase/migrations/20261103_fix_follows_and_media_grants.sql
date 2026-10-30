-- ==============================================================================
-- Migration: 20261103_fix_follows_and_media_grants.sql
-- Description: Fixes "permission denied for table follows" (42501) on media_items,
--              posts, and reels by restoring table grants, enabling RLS policies
--              on follows and church_members, and using SECURITY DEFINER helpers
--              inside RLS policies and media/reels RPCs.
-- Safe and idempotent to run multiple times.
-- ==============================================================================

-- 1. Ensure follows and church_members tables exist with RLS enabled and explicit policies
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id)
);

create table if not exists public.church_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  church_id text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, church_id)
);

alter table public.follows enable row level security;
alter table public.church_members enable row level security;

drop policy if exists "Users can read follows" on public.follows;
create policy "Users can read follows"
  on public.follows for select
  using (true);

drop policy if exists "Users can manage own follows" on public.follows;
create policy "Users can manage own follows"
  on public.follows for all
  to authenticated
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

drop policy if exists "Users can read church_members" on public.church_members;
create policy "Users can read church_members"
  on public.church_members for select
  using (true);

drop policy if exists "Users can manage own church_members" on public.church_members;
create policy "Users can manage own church_members"
  on public.church_members for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Grant schema, table, sequence, and routine permissions to anon and authenticated
grant usage on schema public to postgres, anon, authenticated, service_role;

grant select on table
  public.follows,
  public.church_members,
  public.media_series,
  public.media_items,
  public.media_engagement,
  public.media_views,
  public.watch_progress,
  public.playlists,
  public.playlist_items,
  public.posts,
  public.comments,
  public.profiles,
  public.churches
to anon, authenticated;

grant insert, update, delete on table
  public.follows,
  public.church_members,
  public.media_series,
  public.media_items,
  public.media_engagement,
  public.media_views,
  public.watch_progress,
  public.playlists,
  public.playlist_items,
  public.posts,
  public.comments
to authenticated;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to postgres, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to postgres, service_role;

-- 3. SECURITY DEFINER helper functions so RLS policies never fail with 42501 on subqueries
create or replace function public.is_following_user(p_follower_id uuid, p_followed_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.follows f
    where f.follower_id = p_follower_id
      and f.followed_id = p_followed_id
  );
$$;

create or replace function public.is_active_church_member(p_user_id uuid, p_church_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.church_members cm
    where cm.user_id = p_user_id
      and cm.church_id = p_church_id::text
      and cm.status = 'active'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.church_id = p_church_id
  );
$$;

grant execute on function public.is_following_user(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.is_active_church_member(uuid, uuid) to anon, authenticated, service_role;

-- 4. Update media_items and posts SELECT RLS policies to use SECURITY DEFINER helpers
drop policy if exists "Read published media items" on public.media_items;
create policy "Read published media items"
  on public.media_items for select
  using (
    auth.uid() = author_id
    or (
      status = 'published'
      and (
        visibility = 'public'
        or (
          visibility = 'followers'
          and auth.uid() is not null
          and public.is_following_user(auth.uid(), author_id)
        )
        or (
          visibility = 'church'
          and auth.uid() is not null
          and church_id is not null
          and public.is_active_church_member(auth.uid(), church_id)
        )
      )
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role in ('platform_admin', 'church_admin') or p.badge in ('lead_pastor', 'admin', 'moderator'))
    )
  );

drop policy if exists "Enforce real post visibility on select" on public.posts;
create policy "Enforce real post visibility on select"
  on public.posts for select
  using (
    visibility = 'public'
    or auth.uid() = author_id
    or (
      visibility = 'followers'
      and auth.uid() is not null
      and public.is_following_user(auth.uid(), public.posts.author_id)
    )
    or (
      visibility = 'church'
      and auth.uid() is not null
      and public.posts.church_id is not null
      and public.is_active_church_member(auth.uid(), public.posts.church_id)
    )
  );

-- 5. Make media and reels read RPCs SECURITY DEFINER with built-in visibility checks
create or replace function public.search_media(
  q text,
  p_kind text default null,
  p_category text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  kind text,
  author_id uuid,
  church_id uuid,
  title text,
  description text,
  media_url text,
  thumb_url text,
  duration_seconds integer,
  category text,
  tags text[],
  series_id uuid,
  episode_no integer,
  accent text,
  view_count integer,
  like_count integer,
  published_at timestamptz,
  similarity_score real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.kind,
    m.author_id,
    m.church_id,
    m.title,
    m.description,
    m.media_url,
    m.thumb_url,
    m.duration_seconds,
    m.category,
    m.tags,
    m.series_id,
    m.episode_no,
    m.accent,
    m.view_count,
    m.like_count,
    m.published_at,
    greatest(
      similarity(m.title, coalesce(q, '')),
      case when m.title ilike ('%' || coalesce(q, '') || '%') then 0.6 else 0.0 end
    )::real as similarity_score
  from public.media_items m
  where m.status = 'published'
    and (
      m.visibility = 'public'
      or m.author_id = auth.uid()
      or (m.visibility = 'followers' and auth.uid() is not null and public.is_following_user(auth.uid(), m.author_id))
      or (m.visibility = 'church' and auth.uid() is not null and m.church_id is not null and public.is_active_church_member(auth.uid(), m.church_id))
    )
    and (p_kind is null or m.kind = p_kind)
    and (p_category is null or m.category = p_category)
    and (
      q is null or trim(q) = ''
      or m.title ilike ('%' || trim(q) || '%')
      or similarity(m.title, trim(q)) > 0.15
      or trim(q) = any(m.tags)
    )
  order by similarity_score desc, m.published_at desc
  limit least(coalesce(p_limit, 20), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.trending_media(
  p_kind text default null,
  p_days int default 7,
  p_limit int default 12
)
returns setof public.media_items
language sql
stable
security definer
set search_path = public
as $$
  select m.*
  from public.media_items m
  where m.status = 'published'
    and m.visibility = 'public'
    and (p_kind is null or m.kind = p_kind)
    and m.published_at >= now() - (coalesce(p_days, 7) || ' days')::interval
  order by
    ((m.view_count * 1.0) + (m.like_count * 3.5) + (m.save_count * 2.0)) /
    power(greatest(1.0, extract(epoch from (now() - m.published_at)) / 3600.0 + 2.0), 1.25) desc,
    m.published_at desc
  limit least(coalesce(p_limit, 12), 40);
$$;

create or replace function public.for_you_reels(
  p_limit int default 15,
  p_offset int default 0
)
returns table (
  id uuid,
  author_id uuid,
  church_id uuid,
  category_id text,
  text_content text,
  media_url text,
  media_type text,
  media_duration_seconds integer,
  media_thumbnail_url text,
  sound_title text,
  view_count integer,
  like_count integer,
  comment_count integer,
  duration_seconds integer,
  visibility text,
  created_at timestamptz,
  is_following boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.author_id,
    p.church_id,
    p.category_id,
    p.text_content,
    p.media_url,
    p.media_type,
    p.media_duration_seconds,
    p.media_thumbnail_url,
    coalesce(p.sound_title, 'Original Sound') as sound_title,
    coalesce(p.view_count, 0) as view_count,
    coalesce(p.like_count, 0) as like_count,
    coalesce(p.comment_count, 0) as comment_count,
    coalesce(p.duration_seconds, p.media_duration_seconds, 0) as duration_seconds,
    p.visibility,
    p.created_at,
    case
      when auth.uid() is not null then public.is_following_user(auth.uid(), p.author_id)
      else false
    end as is_following
  from public.posts p
  where p.media_type = 'reel'
    and (
      p.visibility = 'public'
      or p.author_id = auth.uid()
      or (
        p.visibility = 'followers'
        and auth.uid() is not null
        and public.is_following_user(auth.uid(), p.author_id)
      )
    )
  order by
    (
      (coalesce(p.like_count, 0) * 3.5) +
      (coalesce(p.comment_count, 0) * 4.0) +
      (coalesce(p.view_count, 0) * 0.4) +
      case
        when auth.uid() is not null and public.is_following_user(auth.uid(), p.author_id) then 50.0
        else 0.0
      end
    ) / power(greatest(1.0, extract(epoch from (now() - p.created_at)) / 3600.0 + 2.0), 1.25) desc,
    p.created_at desc
  limit least(coalesce(p_limit, 15), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.following_reels(
  p_limit int default 15,
  p_offset int default 0
)
returns table (
  id uuid,
  author_id uuid,
  church_id uuid,
  category_id text,
  text_content text,
  media_url text,
  media_type text,
  media_duration_seconds integer,
  media_thumbnail_url text,
  sound_title text,
  view_count integer,
  like_count integer,
  comment_count integer,
  duration_seconds integer,
  visibility text,
  created_at timestamptz,
  is_following boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.author_id,
    p.church_id,
    p.category_id,
    p.text_content,
    p.media_url,
    p.media_type,
    p.media_duration_seconds,
    p.media_thumbnail_url,
    coalesce(p.sound_title, 'Original Sound') as sound_title,
    coalesce(p.view_count, 0) as view_count,
    coalesce(p.like_count, 0) as like_count,
    coalesce(p.comment_count, 0) as comment_count,
    coalesce(p.duration_seconds, p.media_duration_seconds, 0) as duration_seconds,
    p.visibility,
    p.created_at,
    true as is_following
  from public.posts p
  where p.media_type = 'reel'
    and auth.uid() is not null
    and (
      public.is_following_user(auth.uid(), p.author_id)
      or p.author_id = auth.uid()
    )
  order by p.created_at desc
  limit least(coalesce(p_limit, 15), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.search_media(text, text, text, int, int) to anon, authenticated, service_role;
grant execute on function public.trending_media(text, int, int) to anon, authenticated, service_role;
grant execute on function public.for_you_reels(int, int) to anon, authenticated, service_role;
grant execute on function public.following_reels(int, int) to anon, authenticated, service_role;
grant execute on function public.toggle_media_like(uuid) to authenticated, service_role;
grant execute on function public.toggle_media_save(uuid) to authenticated, service_role;
grant execute on function public.record_media_view(uuid, int, text) to anon, authenticated, service_role;
grant execute on function public.record_reel_view(uuid) to anon, authenticated, service_role;
grant execute on function public.toggle_reel_like(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
