-- =============================================================================
-- Shammah Migration: 20261105_faith_challenges.sql
-- Purpose: Gamified Faith Challenges, streaks, check-in heatmaps, media submissions,
--          voting, leaderboards, and milestone badge logic.
-- 100% IDEMPOTENT & SAFE ON EXISTING TABLES.
-- =============================================================================

-- Ensure role grants on public schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- 1. BASE TABLES
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  challenge_id uuid NOT NULL,
  user_id uuid NOT NULL,
  PRIMARY KEY (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.challenge_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.challenge_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- 2. ENSURE ALL COLUMNS EXIST ON challenges
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rules_md text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Prayer',
  ADD COLUMN IF NOT EXISTS starts_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS accent text DEFAULT '#8b5cf6',
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS participants_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. ENSURE ALL COLUMNS EXIST ON challenge_participants
ALTER TABLE public.challenge_participants
  ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS streak_current integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_best integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checkin_on date,
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

-- 4. ENSURE ALL COLUMNS EXIST ON challenge_checkins
ALTER TABLE public.challenge_checkins
  ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS day date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS points_awarded integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Unique constraint on (challenge_id, user_id, day) to prevent duplicate check-ins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unq_challenge_checkin_day'
  ) THEN
    ALTER TABLE public.challenge_checkins
      ADD CONSTRAINT unq_challenge_checkin_day UNIQUE (challenge_id, user_id, day);
  END IF;
END $$;

-- 5. ENSURE ALL COLUMNS EXIST ON challenge_submissions
ALTER TABLE public.challenge_submissions
  ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS media_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS thumb_url text,
  ADD COLUMN IF NOT EXISTS caption text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hashtag text,
  ADD COLUMN IF NOT EXISTS scripture text,
  ADD COLUMN IF NOT EXISTS audio_title text,
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 6. ENSURE ALL COLUMNS EXIST ON challenge_votes
ALTER TABLE public.challenge_votes
  ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unq_challenge_vote'
  ) THEN
    ALTER TABLE public.challenge_votes
      ADD CONSTRAINT unq_challenge_vote UNIQUE (submission_id, user_id);
  END IF;
END $$;

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_challenges_status_category ON public.challenges (status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_creator ON public.challenges (creator_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON public.challenge_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_checkins_challenge_user ON public.challenge_checkins (challenge_id, user_id, day DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge ON public.challenge_submissions (challenge_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_votes_submission ON public.challenge_votes (submission_id, user_id);

-- 8. RPC: JOIN CHALLENGE
CREATE OR REPLACE FUNCTION public.join_challenge(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_part public.challenge_participants%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be signed in to join.');
  END IF;

  INSERT INTO public.challenge_participants (challenge_id, user_id, joined_at, streak_current, streak_best, points)
  VALUES (p_challenge_id, v_uid, now(), 0, 0, 0)
  ON CONFLICT (challenge_id, user_id) DO NOTHING;

  UPDATE public.challenges
  SET participants_count = (
    SELECT count(*)::int FROM public.challenge_participants WHERE challenge_id = p_challenge_id
  )
  WHERE id = p_challenge_id;

  SELECT * INTO v_part FROM public.challenge_participants WHERE challenge_id = p_challenge_id AND user_id = v_uid;

  RETURN jsonb_build_object('success', true, 'participant', row_to_json(v_part));
END;
$$;

-- 9. RPC: CHECKIN (Server-computes streak & rejects duplicates)
CREATE OR REPLACE FUNCTION public.checkin(
  p_challenge_id uuid,
  p_note text DEFAULT NULL,
  p_media_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := CURRENT_DATE;
  v_part public.challenge_participants%ROWTYPE;
  v_new_streak integer;
  v_best_streak integer;
  v_points_to_add integer := 10;
  v_badge_awarded text := NULL;
  v_challenge public.challenges%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be signed in to check in.');
  END IF;

  SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found.');
  END IF;

  -- Ensure participant row exists
  INSERT INTO public.challenge_participants (challenge_id, user_id, joined_at, streak_current, streak_best, points)
  VALUES (p_challenge_id, v_uid, now(), 0, 0, 0)
  ON CONFLICT (challenge_id, user_id) DO NOTHING;

  SELECT * INTO v_part
  FROM public.challenge_participants
  WHERE challenge_id = p_challenge_id AND user_id = v_uid
  FOR UPDATE;

  -- Prevent duplicate check-in today
  IF v_part.last_checkin_on = v_today THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already checked in for today! Keep the flame burning tomorrow.',
      'streak_current', v_part.streak_current,
      'streak_best', v_part.streak_best
    );
  END IF;

  -- Compute streak
  IF v_part.last_checkin_on = v_today - 1 THEN
    v_new_streak := COALESCE(v_part.streak_current, 0) + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_best_streak := GREATEST(COALESCE(v_part.streak_best, 0), v_new_streak);

  -- Bonus points for milestones
  IF v_new_streak = 3 THEN
    v_points_to_add := v_points_to_add + 15;
    v_badge_awarded := 'Spiritual Spark (3-Day Streak)';
  ELSIF v_new_streak = 7 THEN
    v_points_to_add := v_points_to_add + 35;
    v_badge_awarded := 'Steadfast Believer (7-Day Streak)';
  ELSIF v_new_streak = 21 THEN
    v_points_to_add := v_points_to_add + 100;
    v_badge_awarded := 'Overcomer (21-Day Streak)';
  ELSIF v_new_streak = 40 THEN
    v_points_to_add := v_points_to_add + 250;
    v_badge_awarded := 'Kingdom Champion (40-Day Streak)';
  END IF;

  -- Insert checkin record
  INSERT INTO public.challenge_checkins (challenge_id, user_id, day, note, media_url, points_awarded)
  VALUES (p_challenge_id, v_uid, v_today, p_note, p_media_url, v_points_to_add);

  -- Update participant stats
  UPDATE public.challenge_participants
  SET
    streak_current = v_new_streak,
    streak_best = v_best_streak,
    last_checkin_on = v_today,
    points = COALESCE(points, 0) + v_points_to_add
  WHERE challenge_id = p_challenge_id AND user_id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'day', v_today,
    'streak_current', v_new_streak,
    'streak_best', v_best_streak,
    'points_awarded', v_points_to_add,
    'badge_awarded', v_badge_awarded
  );
END;
$$;

-- 10. RPC: VOTE SUBMISSION (Toggle cheer)
CREATE OR REPLACE FUNCTION public.vote_submission(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_voted boolean;
  v_new_likes integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be signed in to vote.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.challenge_votes WHERE submission_id = p_submission_id AND user_id = v_uid) THEN
    DELETE FROM public.challenge_votes WHERE submission_id = p_submission_id AND user_id = v_uid;
    v_voted := false;
  ELSE
    INSERT INTO public.challenge_votes (submission_id, user_id) VALUES (p_submission_id, v_uid);
    v_voted := true;
  END IF;

  SELECT count(*)::int INTO v_new_likes
  FROM public.challenge_votes
  WHERE submission_id = p_submission_id;

  UPDATE public.challenge_submissions
  SET like_count = v_new_likes
  WHERE id = p_submission_id;

  RETURN jsonb_build_object('success', true, 'voted', v_voted, 'like_count', v_new_likes);
END;
$$;

-- 11. RPC: CHALLENGE LEADERBOARD
CREATE OR REPLACE FUNCTION public.challenge_leaderboard(p_challenge_id uuid, p_scope text DEFAULT 'all')
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  badge text,
  points integer,
  streak_current integer,
  streak_best integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.display_name,
    p.avatar_url,
    p.badge,
    cp.points,
    cp.streak_current,
    cp.streak_best
  FROM public.challenge_participants cp
  JOIN public.profiles p ON p.id = cp.user_id
  WHERE cp.challenge_id = p_challenge_id
  ORDER BY cp.points DESC, cp.streak_best DESC, cp.streak_current DESC
  LIMIT 50;
$$;

-- 12. ROW LEVEL SECURITY
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_votes ENABLE ROW LEVEL SECURITY;

-- Challenges policies
DROP POLICY IF EXISTS "Public can view challenges" ON public.challenges;
CREATE POLICY "Public can view challenges"
  ON public.challenges FOR SELECT
  USING (status IN ('active', 'completed') OR (auth.uid() IS NOT NULL AND auth.uid() = creator_id));

DROP POLICY IF EXISTS "Authenticated can create challenges" ON public.challenges;
CREATE POLICY "Authenticated can create challenges"
  ON public.challenges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators and admins can update challenges" ON public.challenges;
CREATE POLICY "Creators and admins can update challenges"
  ON public.challenges FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );

-- Participants policies
DROP POLICY IF EXISTS "Public can view challenge participants" ON public.challenge_participants;
CREATE POLICY "Public can view challenge participants"
  ON public.challenge_participants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage own participation" ON public.challenge_participants;
CREATE POLICY "Users can manage own participation"
  ON public.challenge_participants FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Checkins policies
DROP POLICY IF EXISTS "Public can view checkins" ON public.challenge_checkins;
CREATE POLICY "Public can view checkins"
  ON public.challenge_checkins FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create own checkins" ON public.challenge_checkins;
CREATE POLICY "Users can create own checkins"
  ON public.challenge_checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Submissions policies
DROP POLICY IF EXISTS "Public can view approved submissions" ON public.challenge_submissions;
CREATE POLICY "Public can view approved submissions"
  ON public.challenge_submissions FOR SELECT
  USING (status = 'approved' OR (auth.uid() IS NOT NULL AND auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can create challenge submissions" ON public.challenge_submissions;
CREATE POLICY "Users can create challenge submissions"
  ON public.challenge_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and moderators can delete submissions" ON public.challenge_submissions;
CREATE POLICY "Users and moderators can delete submissions"
  ON public.challenge_submissions FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.challenges WHERE id = challenge_id AND creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'platform_admin')
    )
  );

-- Votes policies
DROP POLICY IF EXISTS "Public can view votes" ON public.challenge_votes;
CREATE POLICY "Public can view votes"
  ON public.challenge_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage own votes" ON public.challenge_votes;
CREATE POLICY "Users can manage own votes"
  ON public.challenge_votes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
