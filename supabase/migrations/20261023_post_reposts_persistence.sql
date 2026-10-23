-- =============================================================================
-- Shammah Migration: Post Reposts Persistence & Quoted Posts
-- 1. Create public.post_reposts table for storing instant & quoted reposts
-- 2. Add unique constraint for instant reposts per (post_id, user_id)
-- 3. Add quoted_post_id to public.posts for feed-level quote post attribution
-- 4. Enable Row Level Security (RLS) with strict owner-only write and public read
-- 5. RPC helper functions for efficient batch repost counting
-- =============================================================================

-- 1. Create post_reposts table
CREATE TABLE IF NOT EXISTS public.post_reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text,
  quote_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add quoted_post_id to posts table if not exists
ALTER TABLE IF EXISTS public.posts
  ADD COLUMN IF NOT EXISTS quoted_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- 3. Unique index: each user can only have one active instant repost per post
-- (Instant reposts have no comment/quote text)
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_reposts_instant_unique
  ON public.post_reposts(post_id, user_id)
  WHERE (comment IS NULL OR comment = '') AND (quote_text IS NULL OR quote_text = '');

-- Performance indexes for lookup and feed aggregation
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_id ON public.post_reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_user_id ON public.post_reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_created_at ON public.post_reposts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_quoted_post_id ON public.posts(quoted_post_id) WHERE quoted_post_id IS NOT NULL;

-- 4. Role & Table Privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.post_reposts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_reposts TO authenticated;
GRANT ALL PRIVILEGES ON public.post_reposts TO postgres, service_role;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies:
-- Read: Anyone (including signed-in and guest believers) can read repost counts and quotes
DROP POLICY IF EXISTS "Anyone signed in can read post reposts" ON public.post_reposts;
DROP POLICY IF EXISTS "Users can read post reposts" ON public.post_reposts;
CREATE POLICY "Users can read post reposts"
  ON public.post_reposts FOR SELECT
  USING (true);

-- Insert: Authenticated believers can only repost as themselves
DROP POLICY IF EXISTS "Users can insert own reposts" ON public.post_reposts;
CREATE POLICY "Users can insert own reposts"
  ON public.post_reposts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update: Authenticated believers can update only their own repost comments
DROP POLICY IF EXISTS "Users can update own reposts" ON public.post_reposts;
CREATE POLICY "Users can update own reposts"
  ON public.post_reposts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete: Authenticated believers can delete/undo only their own reposts
DROP POLICY IF EXISTS "Users can delete own reposts" ON public.post_reposts;
CREATE POLICY "Users can delete own reposts"
  ON public.post_reposts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Database RPC Functions for Batch Repost Counts
CREATE OR REPLACE FUNCTION public.repost_counts(p_post_ids uuid[])
RETURNS TABLE(post_id uuid, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT pr.post_id, COUNT(*)::bigint AS count
  FROM public.post_reposts pr
  WHERE pr.post_id = ANY(p_post_ids)
  GROUP BY pr.post_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.repost_counts(uuid[]) TO anon, authenticated, service_role;

-- Function for total reposts received across an author's posts
CREATE OR REPLACE FUNCTION public.user_reposts_received_count(p_author_id uuid)
RETURNS bigint AS $$
DECLARE
  v_count bigint;
BEGIN
  SELECT COUNT(*)::bigint INTO v_count
  FROM public.post_reposts pr
  JOIN public.posts p ON p.id = pr.post_id
  WHERE p.author_id = p_author_id;
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.user_reposts_received_count(uuid) TO anon, authenticated, service_role;
