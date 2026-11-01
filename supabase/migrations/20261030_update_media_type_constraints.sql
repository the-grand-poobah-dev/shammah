-- ==============================================================================
-- Migration: 20261030_update_media_type_constraints.sql
-- Description: Expand media_type constraints on posts and comments to support
--              'gif', 'reel', and 'live' (along with existing 'image', 'video',
--              'audio', 'podcast').
-- Idempotent & safe to run directly in Supabase SQL Editor.
-- ==============================================================================

-- 1. POSTS TABLE: Update media_type check constraint
-- Safely drop any existing check constraint on posts.media_type
do $$
declare
  r record;
begin
  for r in (
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
      and tc.table_schema = ccu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'posts'
      and tc.constraint_type = 'CHECK'
      and ccu.column_name = 'media_type'
  ) loop
    execute format('alter table public.posts drop constraint if exists %I', r.constraint_name);
  end loop;
end $$;

-- Also explicitly drop the standard named constraint if it exists
alter table public.posts
  drop constraint if exists posts_media_type_check;

-- Add updated constraint supporting image, video, audio, reel, podcast, gif, live
alter table public.posts
  add constraint posts_media_type_check
  check (
    media_type is null
    or media_type in ('image', 'video', 'audio', 'reel', 'podcast', 'gif', 'live')
  );

comment on column public.posts.media_type is
  'Media attachment format: image, video, audio, reel, podcast, gif, live';


-- 2. COMMENTS TABLE: Update media_type check constraint
-- Safely drop any existing check constraint on comments.media_type
do $$
declare
  r record;
begin
  for r in (
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
      and tc.table_schema = ccu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'comments'
      and tc.constraint_type = 'CHECK'
      and ccu.column_name = 'media_type'
  ) loop
    execute format('alter table public.comments drop constraint if exists %I', r.constraint_name);
  end loop;
end $$;

-- Also explicitly drop standard named constraints if present
alter table public.comments
  drop constraint if exists comments_media_type_check;

-- Add updated constraint supporting image, video, audio, gif
alter table public.comments
  add constraint comments_media_type_check
  check (
    media_type is null
    or media_type in ('image', 'video', 'audio', 'gif')
  );

comment on column public.comments.media_type is
  'Comment media attachment format: image, video, audio, gif';
