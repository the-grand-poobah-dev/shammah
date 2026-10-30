-- =============================================================================
-- Shammah Migration: 20261030_polls_hub.sql
-- Purpose: Complete database-backed Polls, Surveys, Faith Quizzes, Icebreakers,
--          cast_vote RPC, Creator Analytics, Early Close, and Quiz Leaderboard.
-- Safe to run multiple times (idempotent).
-- =============================================================================

-- 0. Ensure role grants on schema and tables so RLS policies never throw 42501
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- 1. Extend public.posts with rich Poll & Quiz metadata columns
ALTER TABLE IF EXISTS public.posts
  ADD COLUMN IF NOT EXISTS poll_type text DEFAULT 'survey'
    CHECK (poll_type IS NULL OR poll_type IN ('survey', 'quiz', 'icebreaker')),
  ADD COLUMN IF NOT EXISTS is_quiz boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiz_explanation text,
  ADD COLUMN IF NOT EXISTS poll_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS poll_multi_select boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_results_until_vote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS poll_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS poll_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS poll_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS poll_accent text,
  ADD COLUMN IF NOT EXISTS poll_category text,
  ADD COLUMN IF NOT EXISTS total_votes_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_poll_type ON public.posts(poll_type) WHERE poll_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_poll_expires_at ON public.posts(poll_expires_at) WHERE poll_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_poll_starts_at ON public.posts(poll_starts_at) WHERE poll_starts_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_poll_category ON public.posts(poll_category) WHERE poll_category IS NOT NULL;

-- 2. Ensure public.poll_options table and columns exist
CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  label text NOT NULL,
  image_url text,
  is_correct boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.poll_options
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_correct boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_poll_options_post_id ON public.poll_options(post_id, position);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.poll_options TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.poll_options TO authenticated, service_role;

DROP POLICY IF EXISTS "poll_options_select_all" ON public.poll_options;
CREATE POLICY "poll_options_select_all"
  ON public.poll_options FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "poll_options_insert_owner" ON public.poll_options;
CREATE POLICY "poll_options_insert_owner"
  ON public.poll_options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "poll_options_modify_owner_or_admin" ON public.poll_options;
CREATE POLICY "poll_options_modify_owner_or_admin"
  ON public.poll_options FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND (
          p.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid()
              AND pr.role IN ('platform_admin', 'church_admin')
          )
        )
    )
  );

-- 3. Ensure public.poll_votes table, columns, and multi-select constraint exist
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.poll_votes
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Drop legacy single-choice unique constraint if present so multi-select polls can store multiple options per voter,
-- while single-choice uniqueness is strictly enforced inside cast_vote() and trigger
ALTER TABLE IF EXISTS public.poll_votes
  DROP CONSTRAINT IF EXISTS poll_votes_post_id_voter_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'poll_votes_post_option_voter_unique'
  ) THEN
    ALTER TABLE public.poll_votes
      ADD CONSTRAINT poll_votes_post_option_voter_unique UNIQUE (post_id, option_id, voter_id);
  END IF;
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id ON public.poll_votes(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON public.poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_voter_id ON public.poll_votes(voter_id, post_id);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.poll_votes TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated, service_role;

DROP POLICY IF EXISTS "poll_votes_select_public" ON public.poll_votes;
CREATE POLICY "poll_votes_select_public"
  ON public.poll_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Block votes on expired polls (INSERT)" ON public.poll_votes;
CREATE POLICY "Block votes on expired polls (INSERT)"
  ON public.poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND p.poll_closed_at IS NULL
        AND (p.poll_starts_at IS NULL OR p.poll_starts_at <= now())
        AND (p.poll_expires_at IS NULL OR p.poll_expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Block vote changes on expired polls (DELETE)" ON public.poll_votes;
CREATE POLICY "Block vote changes on expired polls (DELETE)"
  ON public.poll_votes FOR DELETE
  TO authenticated
  USING (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND p.poll_closed_at IS NULL
        AND (p.poll_expires_at IS NULL OR p.poll_expires_at > now())
    )
  );

-- 4. Create public.quiz_scores table for Faith Quizzes & Weekly Leaderboard
CREATE TABLE IF NOT EXISTS public.quiz_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.poll_options(id) ON DELETE SET NULL,
  is_correct boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1000),
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_scores_poll_id ON public.quiz_scores(poll_id);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_user_week ON public.quiz_scores(answered_at DESC, user_id, score DESC);

ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.quiz_scores TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON public.quiz_scores TO authenticated, service_role;

DROP POLICY IF EXISTS "quiz_scores_select_all" ON public.quiz_scores;
CREATE POLICY "quiz_scores_select_all"
  ON public.quiz_scores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "quiz_scores_insert_own" ON public.quiz_scores;
CREATE POLICY "quiz_scores_insert_own"
  ON public.quiz_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_scores_update_own" ON public.quiz_scores;
CREATE POLICY "quiz_scores_update_own"
  ON public.quiz_scores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Update trigger public.check_poll_not_expired() to enforce starts_at, closed_at, expires_at, and single-vote
CREATE OR REPLACE FUNCTION public.check_poll_not_expired()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at timestamptz;
  v_starts_at timestamptz;
  v_closed_at timestamptz;
  v_multi_select boolean;
  v_existing_count integer;
BEGIN
  SELECT poll_expires_at, poll_starts_at, poll_closed_at, COALESCE(poll_multi_select, false)
  INTO v_expires_at, v_starts_at, v_closed_at, v_multi_select
  FROM public.posts
  WHERE id = NEW.post_id;

  IF v_closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Poll has been closed. No further votes can be recorded.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_starts_at IS NOT NULL AND v_starts_at > now() THEN
    RAISE EXCEPTION 'Poll has not started yet.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at <= now() THEN
    RAISE EXCEPTION 'Poll has closed and expired. No further votes can be recorded.'
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'INSERT' AND NOT v_multi_select THEN
    SELECT count(*) INTO v_existing_count
    FROM public.poll_votes
    WHERE post_id = NEW.post_id AND voter_id = NEW.voter_id;

    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'You have already voted in this poll. Double voting is not allowed.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_poll_not_expired ON public.poll_votes;
CREATE TRIGGER trg_check_poll_not_expired
  BEFORE INSERT OR UPDATE ON public.poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_poll_not_expired();

-- 6. Server-validated RPC: cast_vote(p_poll_id uuid, p_option_id uuid)
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_poll_id uuid,
  p_option_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_post record;
  v_option record;
  v_correct_option_id uuid;
  v_existing_vote_id uuid;
  v_existing_any_count integer;
  v_score integer := 0;
  v_total_votes integer := 0;
  v_counts jsonb := '{}'::jsonb;
  v_my_votes jsonb := '[]'::jsonb;
  v_toggled_off boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to vote.' USING ERRCODE = '42501';
  END IF;

  SELECT
    id,
    poll_type,
    COALESCE(is_quiz, poll_type = 'quiz', false) AS is_quiz,
    quiz_explanation,
    COALESCE(poll_anonymous, is_anonymous, false) AS poll_anonymous,
    COALESCE(poll_multi_select, false) AS poll_multi_select,
    COALESCE(hide_results_until_vote, false) AS hide_results_until_vote,
    poll_starts_at,
    poll_expires_at,
    poll_closed_at
  INTO v_post
  FROM public.posts
  WHERE id = p_poll_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_post.poll_closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'This poll has been closed early by the creator or moderator.' USING ERRCODE = 'P0001';
  END IF;

  IF v_post.poll_starts_at IS NOT NULL AND v_post.poll_starts_at > now() THEN
    RAISE EXCEPTION 'This poll is scheduled to open later.' USING ERRCODE = 'P0001';
  END IF;

  IF v_post.poll_expires_at IS NOT NULL AND v_post.poll_expires_at <= now() THEN
    RAISE EXCEPTION 'This poll has expired and is now closed.' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, post_id, label, COALESCE(is_correct, false) AS is_correct
  INTO v_option
  FROM public.poll_options
  WHERE id = p_option_id AND post_id = p_poll_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid poll option for this poll.' USING ERRCODE = 'P0002';
  END IF;

  -- Check if user already voted for this specific option
  SELECT id INTO v_existing_vote_id
  FROM public.poll_votes
  WHERE post_id = p_poll_id AND option_id = p_option_id AND voter_id = v_uid
  LIMIT 1;

  IF v_post.poll_multi_select AND NOT v_post.is_quiz THEN
    -- In multi-select surveys, clicking an already selected option toggles it off,
    -- or clicking a new option adds it.
    IF v_existing_vote_id IS NOT NULL THEN
      DELETE FROM public.poll_votes WHERE id = v_existing_vote_id;
      v_toggled_off := true;
    ELSE
      INSERT INTO public.poll_votes (post_id, option_id, voter_id, is_anonymous)
      VALUES (p_poll_id, p_option_id, v_uid, v_post.poll_anonymous);
    END IF;
  ELSE
    -- Single-select poll or quiz: reject double votes strictly
    SELECT count(*) INTO v_existing_any_count
    FROM public.poll_votes
    WHERE post_id = p_poll_id AND voter_id = v_uid;

    IF v_existing_any_count > 0 THEN
      RAISE EXCEPTION 'You have already voted in this poll. Double votes are not allowed.'
        USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.poll_votes (post_id, option_id, voter_id, is_anonymous)
    VALUES (p_poll_id, p_option_id, v_uid, v_post.poll_anonymous);
  END IF;

  -- Update option vote_count and post total_votes_count
  UPDATE public.poll_options po
  SET vote_count = (
    SELECT count(*)::integer FROM public.poll_votes pv WHERE pv.option_id = po.id
  )
  WHERE po.post_id = p_poll_id;

  SELECT count(*)::integer INTO v_total_votes
  FROM public.poll_votes
  WHERE post_id = p_poll_id;

  UPDATE public.posts
  SET total_votes_count = v_total_votes
  WHERE id = p_poll_id;

  -- If quiz mode, award points and record quiz_scores
  IF v_post.is_quiz THEN
    SELECT id INTO v_correct_option_id
    FROM public.poll_options
    WHERE post_id = p_poll_id AND is_correct = true
    ORDER BY position ASC
    LIMIT 1;

    v_score := CASE WHEN v_option.is_correct THEN 100 ELSE 10 END;

    INSERT INTO public.quiz_scores (poll_id, user_id, option_id, is_correct, score, answered_at)
    VALUES (p_poll_id, v_uid, p_option_id, v_option.is_correct, v_score, now())
    ON CONFLICT (poll_id, user_id) DO NOTHING;
  END IF;

  -- Build updated counts map
  SELECT COALESCE(jsonb_object_agg(option_id::text, cnt), '{}'::jsonb)
  INTO v_counts
  FROM (
    SELECT option_id, count(*)::integer AS cnt
    FROM public.poll_votes
    WHERE post_id = p_poll_id
    GROUP BY option_id
  ) sub;

  -- Build caller's selected option IDs array
  SELECT COALESCE(jsonb_agg(option_id::text), '[]'::jsonb)
  INTO v_my_votes
  FROM public.poll_votes
  WHERE post_id = p_poll_id AND voter_id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'poll_id', p_poll_id,
    'option_id', p_option_id,
    'toggled_off', v_toggled_off,
    'is_quiz', v_post.is_quiz,
    'is_correct', CASE WHEN v_post.is_quiz THEN v_option.is_correct ELSE null END,
    'score', CASE WHEN v_post.is_quiz THEN v_score ELSE 0 END,
    'correct_option_id', v_correct_option_id,
    'explanation', v_post.quiz_explanation,
    'total_votes', v_total_votes,
    'counts', v_counts,
    'my_votes', v_my_votes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_vote(uuid, uuid) TO authenticated, service_role;

-- 7. RPC to close a poll early (creator or platform/church admin)
CREATE OR REPLACE FUNCTION public.close_poll_early(p_poll_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_author_id uuid;
  v_is_admin boolean := false;
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  SELECT author_id INTO v_author_id
  FROM public.posts
  WHERE id = p_poll_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid
      AND (
        role IN ('platform_admin', 'church_admin')
        OR (badge_verified = true AND badge IN ('pastor', 'elder', 'bishop', 'reverend', 'apostle'))
      )
  ) INTO v_is_admin;

  IF v_author_id <> v_uid AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Only the poll creator or a church moderator can close this poll early.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.posts
  SET
    poll_closed_at = v_now,
    poll_expires_at = LEAST(COALESCE(poll_expires_at, v_now), v_now)
  WHERE id = p_poll_id;

  RETURN jsonb_build_object(
    'ok', true,
    'poll_id', p_poll_id,
    'closed_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_poll_early(uuid) TO authenticated, service_role;

-- 8. RPC for Weekly Quiz Leaderboard
CREATE OR REPLACE FUNCTION public.weekly_quiz_leaderboard(p_limit integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  badge text,
  badge_verified boolean,
  role text,
  total_score bigint,
  quizzes_taken bigint,
  correct_count bigint,
  accuracy_pct integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    qs.user_id,
    COALESCE(pr.display_name, 'Believer') AS display_name,
    pr.avatar_url,
    pr.badge,
    COALESCE(pr.badge_verified, false) AS badge_verified,
    COALESCE(pr.role, 'member') AS role,
    SUM(qs.score)::bigint AS total_score,
    COUNT(qs.id)::bigint AS quizzes_taken,
    SUM(CASE WHEN qs.is_correct THEN 1 ELSE 0 END)::bigint AS correct_count,
    ROUND(
      (SUM(CASE WHEN qs.is_correct THEN 1 ELSE 0 END)::numeric / GREATEST(COUNT(qs.id), 1)) * 100
    )::integer AS accuracy_pct
  FROM public.quiz_scores qs
  LEFT JOIN public.profiles pr ON pr.id = qs.user_id
  WHERE qs.answered_at >= (now() - interval '7 days')
  GROUP BY qs.user_id, pr.display_name, pr.avatar_url, pr.badge, pr.badge_verified, pr.role
  ORDER BY total_score DESC, correct_count DESC, MAX(qs.answered_at) ASC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

GRANT EXECUTE ON FUNCTION public.weekly_quiz_leaderboard(integer) TO anon, authenticated, service_role;

-- 9. Ensure poll_results(uuid[]) helper function exists and works for anon + authenticated
CREATE OR REPLACE FUNCTION public.poll_results(p_post_ids uuid[])
RETURNS TABLE (
  post_id uuid,
  option_id uuid,
  votes bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pv.post_id,
    pv.option_id,
    COUNT(*)::bigint AS votes
  FROM public.poll_votes pv
  WHERE pv.post_id = ANY(p_post_ids)
  GROUP BY pv.post_id, pv.option_id;
$$;

GRANT EXECUTE ON FUNCTION public.poll_results(uuid[]) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
