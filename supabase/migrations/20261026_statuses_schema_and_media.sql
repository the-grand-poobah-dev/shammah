-- =============================================================================
-- Shammah Migration: 24-Hour Statuses Schema, Media Support & Storage RLS
-- 1. Create public.statuses table with media_type ('image', 'video', 'audio')
-- 2. Row-Level Security (RLS):
--    - Anyone signed in can read unexpired statuses (expires_at > now())
--    - Only owner can insert or delete their own
--    - expires_at defaults to created_at plus 24 hours
-- 3. Storage policy on 'post-media' bucket: owner can upload only into their own folder
-- =============================================================================

-- 1. Create public.statuses table if not exists
CREATE TABLE IF NOT EXISTS public.statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  scripture_tag text,
  bg_style text NOT NULL DEFAULT 'emerald',
  media_url text,
  media_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Ensure media_type column exists
ALTER TABLE IF EXISTS public.statuses
  ADD COLUMN IF NOT EXISTS media_type text;

-- Add check constraint on media_type
ALTER TABLE IF EXISTS public.statuses
  DROP CONSTRAINT IF EXISTS statuses_media_type_check;

ALTER TABLE IF EXISTS public.statuses
  ADD CONSTRAINT statuses_media_type_check
  CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'audio'));

-- Ensure default for expires_at is created_at + 24 hours
ALTER TABLE IF EXISTS public.statuses
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

-- Helpful indexes for status fetching and expiry cleanup
CREATE INDEX IF NOT EXISTS idx_statuses_expires_at ON public.statuses(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_statuses_created_at ON public.statuses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_statuses_user_id ON public.statuses(user_id);

-- Grants & privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.statuses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.statuses TO authenticated;
GRANT ALL PRIVILEGES ON public.statuses TO postgres, service_role;

-- 2. Row Level Security (RLS) on public.statuses
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

-- Read: Anyone signed in (and anon for public community feed) can read unexpired statuses
DROP POLICY IF EXISTS "Anyone signed in can read unexpired statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can read unexpired statuses" ON public.statuses;
DROP POLICY IF EXISTS "Anon can read unexpired statuses" ON public.statuses;

CREATE POLICY "Anyone signed in can read unexpired statuses"
  ON public.statuses FOR SELECT
  TO authenticated
  USING (expires_at > now());

CREATE POLICY "Anon can read unexpired statuses"
  ON public.statuses FOR SELECT
  TO anon
  USING (expires_at > now());

-- Insert: Authenticated believers can only insert their own statuses
DROP POLICY IF EXISTS "Users can insert own statuses" ON public.statuses;
CREATE POLICY "Users can insert own statuses"
  ON public.statuses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Delete: Authenticated believers can only delete their own statuses
DROP POLICY IF EXISTS "Users can delete own statuses" ON public.statuses;
CREATE POLICY "Users can delete own statuses"
  ON public.statuses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update: Authenticated believers can only update their own statuses
DROP POLICY IF EXISTS "Users can update own statuses" ON public.statuses;
CREATE POLICY "Users can update own statuses"
  ON public.statuses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Storage bucket & RLS policies for owner-only folder uploads:
-- Bucket 'post-media' path pattern: <userId>/<timestamp>-<filename>
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  104857600, -- 100 MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 104857600,
      allowed_mime_types = ARRAY[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'
      ];

-- Read policy on post-media
DROP POLICY IF EXISTS "post-media read" ON storage.objects;
CREATE POLICY "post-media read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

-- Owner-only upload into their own folder: (storage.foldername(name))[1] = auth.uid()::text
DROP POLICY IF EXISTS "post-media insert" ON storage.objects;
CREATE POLICY "post-media insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner-only update into their own folder
DROP POLICY IF EXISTS "post-media update" ON storage.objects;
CREATE POLICY "post-media update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner-only delete in their own folder
DROP POLICY IF EXISTS "post-media delete" ON storage.objects;
CREATE POLICY "post-media delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
