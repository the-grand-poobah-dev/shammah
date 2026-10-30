-- ==============================================================================
-- Migration: 20261102_reels_and_media_comments.sql
-- Description: Reels metrics & ranking RPCs on posts, plus media_items comment support
-- Safe, idempotent, preserves all existing tables and data.
-- ==============================================================================

-- 1. Ensure extra columns on posts for Reels metrics and sound tracking
alter table public.posts
  add column if not exists view_count integer not null default 0,
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists sound_title text default 'Original Sound',
  add column if not exists duration_seconds integer default 0;

-- Helpful indexes for Reels
create index if not exists idx_posts_reels_created on public.posts (media_type, created_at desc) where media_type = 'reel';
create index if not exists idx_posts_author_reels on public.posts (author_id, media_type) where media_type = 'reel';

-- 2. Support comments attached to media_items (in addition to posts)
alter table public.comments
  add column if not exists media_id uuid references public.media_items(id) on delete cascade;

-- Allow comments without post_id when media_id is provided
do $$
begin
  alter table public.comments alter column post_id drop not null;
exception when others then
  null;
end $$;

create index if not exists idx_comments_media_id on public.comments (media_id, created_at asc) where media_id is not null;

-- Ensure RLS on comments allows reading and creating media comments
drop policy if exists "Read comments for visible media" on public.comments;
create policy "Read comments for visible media"
  on public.comments for select
  using (
    post_id is not null
    or (
      media_id is not null
      and exists (
        select 1 from public.media_items m
        where m.id = comments.media_id
          and (m.status = 'published' or m.author_id = auth.uid())
      )
    )
  );

-- 3. Reels RPC: For You Feed
-- Combines recency decay, like/view/comment engagement, and a 50-point boost for followed creators
create or replace function public.for_you_reels(
  p_limit int default 15,
  p_offset int default 0
)
returns table (
  id uuid,
  author_id uuid,
  church_id text,
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
set search_path = public
as $$
  select
    p.id,
    p.author_id,
    p.church_id::text,
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
    exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followed_id = p.author_id
    ) as is_following
  from public.posts p
  where p.media_type = 'reel'
    and (
      p.visibility = 'public'
      or p.author_id = auth.uid()
      or (
        p.visibility = 'followers'
        and exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.followed_id = p.author_id
        )
      )
    )
  order by
    (
      (coalesce(p.like_count, 0) * 3.5) +
      (coalesce(p.comment_count, 0) * 4.0) +
      (coalesce(p.view_count, 0) * 0.4) +
      case when exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.followed_id = p.author_id
      ) then 50.0 else 0.0 end
    ) / power(greatest(1.0, extract(epoch from (now() - p.created_at)) / 3600.0 + 2.0), 1.25) desc,
    p.created_at desc
  limit least(coalesce(p_limit, 15), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- 4. Reels RPC: Following Feed
create or replace function public.following_reels(
  p_limit int default 15,
  p_offset int default 0
)
returns table (
  id uuid,
  author_id uuid,
  church_id text,
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
set search_path = public
as $$
  select
    p.id,
    p.author_id,
    p.church_id::text,
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
    and (
      p.author_id in (
        select followed_id from public.follows where follower_id = auth.uid()
      )
      or p.author_id = auth.uid()
    )
  order by p.created_at desc
  limit least(coalesce(p_limit, 15), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- 5. Record Reel View RPC
create or replace function public.record_reel_view(p_reel_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count int;
begin
  update public.posts
  set view_count = coalesce(view_count, 0) + 1
  where id = p_reel_id
  returning view_count into v_new_count;

  return coalesce(v_new_count, 0);
end;
$$;

-- 6. Toggle Reel Like RPC
create or replace function public.toggle_reel_like(p_reel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_liked boolean;
  v_like_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required to like reels';
  end if;

  if exists (
    select 1 from public.reactions
    where target_id = p_reel_id::text and user_id = v_user_id and target_type = 'post'
  ) then
    delete from public.reactions
    where target_id = p_reel_id::text and user_id = v_user_id and target_type = 'post';

    update public.posts
    set like_count = greatest(0, coalesce(like_count, 0) - 1)
    where id = p_reel_id
    returning like_count into v_like_count;

    v_liked := false;
  else
    insert into public.reactions (target_id, target_type, user_id, emoji, created_at)
    values (p_reel_id::text, 'post', v_user_id, '❤️', now())
    on conflict do nothing;

    update public.posts
    set like_count = coalesce(like_count, 0) + 1
    where id = p_reel_id
    returning like_count into v_like_count;

    v_liked := true;
  end if;

  return jsonb_build_object(
    'reel_id', p_reel_id,
    'liked', v_liked,
    'like_count', coalesce(v_like_count, 0)
  );
end;
$$;
