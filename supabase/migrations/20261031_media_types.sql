-- ==============================================================================
-- Migration: 20261031_media_types.sql
-- Description: Expand media_type constraints on posts, comments, and statuses
--              to include 'gif' and 'live', and add media_meta jsonb if absent.
-- Fully idempotent & safe to run directly in Supabase SQL Editor.
-- ==============================================================================

-- 1. POSTS TABLE: Ensure media_meta column and update media_type check constraint
ALTER TABLE IF EXISTS public.posts
  ADD COLUMN IF NOT EXISTS media_meta jsonb DEFAULT '{}'::jsonb;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'posts'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'media_type'
  ) LOOP
    EXECUTE format('ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.posts
  DROP CONSTRAINT IF EXISTS posts_media_type_check;

ALTER TABLE IF EXISTS public.posts
  ADD CONSTRAINT posts_media_type_check
  CHECK (
    media_type IS NULL
    OR media_type IN ('image', 'video', 'audio', 'reel', 'podcast', 'gif', 'live')
  );

COMMENT ON COLUMN public.posts.media_type IS
  'Media format: image, video, audio, reel, podcast, gif, live';
COMMENT ON COLUMN public.posts.media_meta IS
  'Metadata for media: provider, gif id, width, height, duration, aspect, etc.';


-- 2. COMMENTS TABLE: Ensure media_meta column and update media_type check constraint
ALTER TABLE IF EXISTS public.comments
  ADD COLUMN IF NOT EXISTS media_meta jsonb DEFAULT '{}'::jsonb;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'comments'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'media_type'
  ) LOOP
    EXECUTE format('ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.comments
  DROP CONSTRAINT IF EXISTS comments_media_type_check;

ALTER TABLE IF EXISTS public.comments
  ADD CONSTRAINT comments_media_type_check
  CHECK (
    media_type IS NULL
    OR media_type IN ('image', 'video', 'audio', 'reel', 'podcast', 'gif', 'live')
  );

COMMENT ON COLUMN public.comments.media_type IS
  'Comment media format: image, video, audio, reel, podcast, gif, live';


-- 3. STATUSES TABLE: Ensure media_meta column and update media_type check constraint
ALTER TABLE IF EXISTS public.statuses
  ADD COLUMN IF NOT EXISTS media_meta jsonb DEFAULT '{}'::jsonb;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'statuses'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'media_type'
  ) LOOP
    EXECUTE format('ALTER TABLE public.statuses DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.statuses
  DROP CONSTRAINT IF EXISTS statuses_media_type_check;

ALTER TABLE IF EXISTS public.statuses
  ADD CONSTRAINT statuses_media_type_check
  CHECK (
    media_type IS NULL
    OR media_type IN ('image', 'video', 'audio', 'gif', 'live')
  );

COMMENT ON COLUMN public.statuses.media_type IS
  '24h Status media format: image, video, audio, gif, live';
