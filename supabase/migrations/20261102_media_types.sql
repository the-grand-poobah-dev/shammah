-- ==============================================================================
-- Migration: 20261102_media_types.sql
-- Description: 
--   1. Extend media_type check constraints on posts, comments, and statuses
--      to support 'gif' and 'live' (alongside image, video, audio, reel, podcast).
--   2. Add media_meta jsonb column to posts, comments, and statuses for storing
--      GIF metadata (provider, gif_id, width, height, duration, aspect ratio).
-- Idempotent & safe to run in Supabase SQL editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. POSTS TABLE: media_type constraint & media_meta column
-- ------------------------------------------------------------------------------
alter table if exists public.posts
  add column if not exists media_meta jsonb default '{}'::jsonb;

-- Safely drop existing check constraints on posts.media_type
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

alter table if exists public.posts
  drop constraint if exists posts_media_type_check;

alter table if exists public.posts
  add constraint posts_media_type_check
  check (
    media_type is null
    or media_type in ('image', 'video', 'audio', 'reel', 'podcast', 'gif', 'live')
  );

comment on column public.posts.media_meta is
  'JSON metadata for media attachments: { provider, gif_id, width, height, duration, aspect, loop }';


-- ------------------------------------------------------------------------------
-- 2. COMMENTS TABLE: media_type constraint & media_meta column
-- ------------------------------------------------------------------------------
alter table if exists public.comments
  add column if not exists media_meta jsonb default '{}'::jsonb;

-- Safely drop existing check constraints on comments.media_type
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

alter table if exists public.comments
  drop constraint if exists comments_media_type_check;

alter table if exists public.comments
  add constraint comments_media_type_check
  check (
    media_type is null
    or media_type in ('image', 'video', 'audio', 'gif', 'live')
  );

comment on column public.comments.media_meta is
  'JSON metadata for comment attachments: { provider, gif_id, width, height, duration, aspect }';


-- ------------------------------------------------------------------------------
-- 3. STATUSES TABLE: media_type constraint & media_meta column
-- ------------------------------------------------------------------------------
alter table if exists public.statuses
  add column if not exists media_meta jsonb default '{}'::jsonb;

-- Safely drop existing check constraints on statuses.media_type
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
      and tc.table_name = 'statuses'
      and tc.constraint_type = 'CHECK'
      and ccu.column_name = 'media_type'
  ) loop
    execute format('alter table public.statuses drop constraint if exists %I', r.constraint_name);
  end loop;
end $$;

alter table if exists public.statuses
  drop constraint if exists statuses_media_type_check;

alter table if exists public.statuses
  add constraint statuses_media_type_check
  check (
    media_type is null
    or media_type in ('image', 'video', 'audio', 'gif', 'live')
  );

comment on column public.statuses.media_meta is
  'JSON metadata for 24-hour status attachments: { provider, gif_id, width, height, aspect }';

-- ------------------------------------------------------------------------------
-- 4. Reload PostgREST schema cache
-- ------------------------------------------------------------------------------
notify pgrst, 'reload schema';
