-- =============================================================================
-- Shammah (Kletos) Migration: Poll Expiration Enforcement
-- 1. Add poll_expires_at timestamptz (nullable) to posts table
-- 2. Adjust RLS policies on poll_votes using voter_id to prevent votes on closed polls
-- 3. Add database trigger function for absolute server-side rejection of votes on expired polls
-- =============================================================================

-- 1. Add poll_expires_at column to posts table if not exists
ALTER TABLE IF EXISTS public.posts
  ADD COLUMN IF NOT EXISTS poll_expires_at timestamptz;

-- Index for expiration lookups and feed ordering
CREATE INDEX IF NOT EXISTS idx_posts_poll_expires_at
  ON public.posts(poll_expires_at)
  WHERE poll_expires_at IS NOT NULL;

-- 2. Ensure RLS is active on poll_votes
ALTER TABLE IF EXISTS public.poll_votes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Members can read poll votes
DROP POLICY IF EXISTS "Anyone can read poll votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can read poll votes" ON public.poll_votes;
CREATE POLICY "Users can read poll votes"
  ON public.poll_votes FOR SELECT
  USING (true);

-- 4. RLS Policy: Members vote as themselves (voter_id) on active (non-expired) polls
DROP POLICY IF EXISTS "members vote as themselves" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can vote in polls" ON public.poll_votes;
CREATE POLICY "members vote as themselves"
  ON public.poll_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id
    AND NOT EXISTS (
      SELECT 1 FROM public.poll_options po
      JOIN public.posts p ON p.id = po.post_id
      WHERE po.id = poll_votes.option_id
        AND p.poll_expires_at IS NOT NULL
        AND p.poll_expires_at <= now()
    )
  );

-- 5. RLS Policy: Members can change their own vote (voter_id) only while poll is open
DROP POLICY IF EXISTS "members can change their own vote" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can update own poll vote" ON public.poll_votes;
CREATE POLICY "members can change their own vote"
  ON public.poll_votes FOR UPDATE
  USING (
    auth.uid() = voter_id
    AND NOT EXISTS (
      SELECT 1 FROM public.poll_options po
      JOIN public.posts p ON p.id = po.post_id
      WHERE po.id = poll_votes.option_id
        AND p.poll_expires_at IS NOT NULL
        AND p.poll_expires_at <= now()
    )
  )
  WITH CHECK (
    auth.uid() = voter_id
    AND NOT EXISTS (
      SELECT 1 FROM public.poll_options po
      JOIN public.posts p ON p.id = po.post_id
      WHERE po.id = poll_votes.option_id
        AND p.poll_expires_at IS NOT NULL
        AND p.poll_expires_at <= now()
    )
  );

-- 6. RLS Policy: Members can delete their own vote (voter_id) only while poll is open
DROP POLICY IF EXISTS "members can remove their own vote" ON public.poll_votes;
CREATE POLICY "members can remove their own vote"
  ON public.poll_votes FOR DELETE
  USING (
    auth.uid() = voter_id
    AND NOT EXISTS (
      SELECT 1 FROM public.poll_options po
      JOIN public.posts p ON p.id = po.post_id
      WHERE po.id = poll_votes.option_id
        AND p.poll_expires_at IS NOT NULL
        AND p.poll_expires_at <= now()
    )
  );

-- 7. Server-side Trigger Function to guarantee rejection at database level
CREATE OR REPLACE FUNCTION public.check_poll_not_expired()
RETURNS TRIGGER AS $$
DECLARE
  v_expires_at timestamptz;
BEGIN
  -- Resolve expiration via option_id lookup into poll_options and posts
  SELECT p.poll_expires_at INTO v_expires_at
  FROM public.poll_options po
  JOIN public.posts p ON p.id = po.post_id
  WHERE po.id = NEW.option_id;

  -- Fallback to direct post_id on NEW if available and expiration wasn't resolved yet
  IF v_expires_at IS NULL AND NEW.post_id IS NOT NULL THEN
    SELECT poll_expires_at INTO v_expires_at
    FROM public.posts
    WHERE id = NEW.post_id;
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at <= now() THEN
    RAISE EXCEPTION 'This poll has closed (closed at %). New votes cannot be cast.', v_expires_at
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_poll_not_expired ON public.poll_votes;
CREATE TRIGGER trg_check_poll_not_expired
  BEFORE INSERT OR UPDATE ON public.poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_poll_not_expired();
