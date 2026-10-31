-- =============================================================================
-- Shammah Migration: 20261106_arcade.sql
-- Purpose: Faith Champions Arcade Hub with persistent scores, leaderboards,
--          daily challenges, player streaks, achievements, and question bank.
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
CREATE TABLE IF NOT EXISTS public.arcade_games (
  slug text PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.arcade_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.arcade_daily (
  game_slug text NOT NULL,
  day date NOT NULL,
  PRIMARY KEY (game_slug, day)
);

CREATE TABLE IF NOT EXISTS public.arcade_progress (
  user_id uuid NOT NULL,
  game_slug text NOT NULL,
  PRIMARY KEY (user_id, game_slug)
);

CREATE TABLE IF NOT EXISTS public.arcade_achievements (
  user_id uuid NOT NULL,
  code text NOT NULL,
  PRIMARY KEY (user_id, code)
);

CREATE TABLE IF NOT EXISTS public.arcade_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- 2. ENSURE ALL COLUMNS EXIST ON arcade_games
ALTER TABLE public.arcade_games
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '🎮',
  ADD COLUMN IF NOT EXISTS accent text NOT NULL DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'arcade',
  ADD COLUMN IF NOT EXISTS max_plausible_score integer NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS min_duration_ms integer NOT NULL DEFAULT 3000,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 3. ENSURE ALL COLUMNS EXIST ON arcade_scores
ALTER TABLE public.arcade_scores
  ADD COLUMN IF NOT EXISTS game_slug text REFERENCES public.arcade_games(slug) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS duration_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 4. ENSURE ALL COLUMNS EXIST ON arcade_daily
ALTER TABLE public.arcade_daily
  ADD COLUMN IF NOT EXISTS seed text NOT NULL DEFAULT 'seed-1',
  ADD COLUMN IF NOT EXISTS bonus_multiplier numeric NOT NULL DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 5. ENSURE ALL COLUMNS EXIST ON arcade_progress
ALTER TABLE public.arcade_progress
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS best_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plays integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_played_on date,
  ADD COLUMN IF NOT EXISTS streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 6. ENSURE ALL COLUMNS EXIST ON arcade_achievements
ALTER TABLE public.arcade_achievements
  ADD COLUMN IF NOT EXISTS earned_at timestamptz NOT NULL DEFAULT now();

-- 7. ENSURE ALL COLUMNS EXIST ON arcade_questions
ALTER TABLE public.arcade_questions
  ADD COLUMN IF NOT EXISTS question text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS correct_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS testament text NOT NULL DEFAULT 'Both',
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'teens',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 8. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_arcade_scores_game_score ON public.arcade_scores (game_slug, score DESC);
CREATE INDEX IF NOT EXISTS idx_arcade_scores_user ON public.arcade_scores (user_id);
CREATE INDEX IF NOT EXISTS idx_arcade_scores_created ON public.arcade_scores (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arcade_progress_game_user ON public.arcade_progress (game_slug, user_id);
CREATE INDEX IF NOT EXISTS idx_arcade_questions_diff_cat ON public.arcade_questions (difficulty, category);

-- 9. RPC: SUBMIT_SCORE
-- Server-validated score recording with atomic progress, streak, and achievement calculations
CREATE OR REPLACE FUNCTION public.submit_arcade_score(
  p_game_slug text,
  p_score integer,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_duration_ms integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := CURRENT_DATE;
  v_game public.arcade_games%ROWTYPE;
  v_score_id uuid;
  v_progress public.arcade_progress%ROWTYPE;
  v_is_new_best boolean := false;
  v_new_best integer;
  v_new_streak integer;
  v_unlocked_achievements text[] := ARRAY[]::text[];
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be authenticated to submit scores.');
  END IF;

  SELECT * INTO v_game FROM public.arcade_games WHERE slug = p_game_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive game.');
  END IF;

  -- Enforce server-side plausibility limits
  IF p_score < 0 OR p_score > v_game.max_plausible_score THEN
    RETURN jsonb_build_object('success', false, 'error', 'Score rejected due to implausibility bounds.');
  END IF;

  IF p_duration_ms < v_game.min_duration_ms AND p_score > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Play duration too short for reported score.');
  END IF;

  -- Insert score record
  INSERT INTO public.arcade_scores (game_slug, user_id, score, meta, duration_ms, created_at)
  VALUES (p_game_slug, v_uid, p_score, p_meta, p_duration_ms, now())
  RETURNING id INTO v_score_id;

  -- Load existing progress or initialize
  SELECT * INTO v_progress
  FROM public.arcade_progress
  WHERE user_id = v_uid AND game_slug = p_game_slug
  FOR UPDATE;

  IF NOT FOUND THEN
    v_new_best := p_score;
    v_is_new_best := (p_score > 0);
    v_new_streak := 1;

    INSERT INTO public.arcade_progress (user_id, game_slug, level, best_score, plays, last_played_on, streak, updated_at)
    VALUES (v_uid, p_game_slug, 1, p_score, 1, v_today, 1, now());
  ELSE
    IF p_score > v_progress.best_score THEN
      v_is_new_best := true;
      v_new_best := p_score;
    ELSE
      v_new_best := v_progress.best_score;
    END IF;

    -- Streak logic
    IF v_progress.last_played_on = v_today THEN
      v_new_streak := v_progress.streak;
    ELSIF v_progress.last_played_on = v_today - 1 THEN
      v_new_streak := COALESCE(v_progress.streak, 0) + 1;
    ELSE
      v_new_streak := 1;
    END IF;

    UPDATE public.arcade_progress
    SET
      best_score = v_new_best,
      plays = plays + 1,
      last_played_on = v_today,
      streak = v_new_streak,
      level = GREATEST(1, FLOOR(v_new_best / 250) + 1),
      updated_at = now()
    WHERE user_id = v_uid AND game_slug = p_game_slug;
  END IF;

  -- Evaluate achievements
  -- 1. First Win
  IF p_score > 0 THEN
    IF NOT EXISTS (SELECT 1 FROM public.arcade_achievements WHERE user_id = v_uid AND code = 'first_win') THEN
      INSERT INTO public.arcade_achievements (user_id, code) VALUES (v_uid, 'first_win') ON CONFLICT DO NOTHING;
      v_unlocked_achievements := array_append(v_unlocked_achievements, 'first_win');
    END IF;
  END IF;

  -- 2. Score milestones
  IF p_score >= 500 THEN
    IF NOT EXISTS (SELECT 1 FROM public.arcade_achievements WHERE user_id = v_uid AND code = 'score_500') THEN
      INSERT INTO public.arcade_achievements (user_id, code) VALUES (v_uid, 'score_500') ON CONFLICT DO NOTHING;
      v_unlocked_achievements := array_append(v_unlocked_achievements, 'score_500');
    END IF;
  END IF;

  IF p_score >= 1000 THEN
    IF NOT EXISTS (SELECT 1 FROM public.arcade_achievements WHERE user_id = v_uid AND code = 'score_1000') THEN
      INSERT INTO public.arcade_achievements (user_id, code) VALUES (v_uid, 'score_1000') ON CONFLICT DO NOTHING;
      v_unlocked_achievements := array_append(v_unlocked_achievements, 'score_1000');
    END IF;
  END IF;

  -- 3. Streaks
  IF v_new_streak >= 3 THEN
    IF NOT EXISTS (SELECT 1 FROM public.arcade_achievements WHERE user_id = v_uid AND code = 'streak_3') THEN
      INSERT INTO public.arcade_achievements (user_id, code) VALUES (v_uid, 'streak_3') ON CONFLICT DO NOTHING;
      v_unlocked_achievements := array_append(v_unlocked_achievements, 'streak_3');
    END IF;
  END IF;

  IF v_new_streak >= 7 THEN
    IF NOT EXISTS (SELECT 1 FROM public.arcade_achievements WHERE user_id = v_uid AND code = 'streak_7') THEN
      INSERT INTO public.arcade_achievements (user_id, code) VALUES (v_uid, 'streak_7') ON CONFLICT DO NOTHING;
      v_unlocked_achievements := array_append(v_unlocked_achievements, 'streak_7');
    END IF;
  END IF;

  -- Game specific achievements
  IF p_game_slug = 'david' AND (p_meta->>'goliath_down')::boolean = true THEN
    IF NOT EXISTS (SELECT 1 FROM public.arcade_achievements WHERE user_id = v_uid AND code = 'goliath_slayer') THEN
      INSERT INTO public.arcade_achievements (user_id, code) VALUES (v_uid, 'goliath_slayer') ON CONFLICT DO NOTHING;
      v_unlocked_achievements := array_append(v_unlocked_achievements, 'goliath_slayer');
    END IF;
  END IF;

  IF p_game_slug = 'ark' AND (p_meta->>'pairs_rescued')::integer >= 6 THEN
    IF NOT EXISTS (SELECT 1 FROM public.arcade_achievements WHERE user_id = v_uid AND code = 'ark_master') THEN
      INSERT INTO public.arcade_achievements (user_id, code) VALUES (v_uid, 'ark_master') ON CONFLICT DO NOTHING;
      v_unlocked_achievements := array_append(v_unlocked_achievements, 'ark_master');
    END IF;
  END IF;

  IF p_game_slug = 'scramble' AND p_score >= 300 THEN
    IF NOT EXISTS (SELECT 1 FROM public.arcade_achievements WHERE user_id = v_uid AND code = 'scramble_whiz') THEN
      INSERT INTO public.arcade_achievements (user_id, code) VALUES (v_uid, 'scramble_whiz') ON CONFLICT DO NOTHING;
      v_unlocked_achievements := array_append(v_unlocked_achievements, 'scramble_whiz');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'score_id', v_score_id,
    'score', p_score,
    'best_score', v_new_best,
    'is_new_best', v_is_new_best,
    'streak', v_new_streak,
    'unlocked_achievements', to_jsonb(v_unlocked_achievements)
  );
END;
$$;

-- 10. RPC: LEADERBOARD
CREATE OR REPLACE FUNCTION public.arcade_leaderboard(
  p_game_slug text DEFAULT 'all',
  p_scope text DEFAULT 'weekly',
  p_church_id uuid DEFAULT NULL
)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  badge text,
  church_name text,
  score integer,
  game_slug text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT
      s.id,
      s.user_id,
      s.game_slug,
      s.score,
      s.created_at,
      p.display_name,
      p.avatar_url,
      p.badge,
      c.name AS church_name,
      ROW_NUMBER() OVER (
        PARTITION BY s.user_id, CASE WHEN p_game_slug = 'all' THEN s.game_slug ELSE NULL END
        ORDER BY s.score DESC, s.created_at ASC
      ) AS rn
    FROM public.arcade_scores s
    JOIN public.profiles p ON p.id = s.user_id
    LEFT JOIN public.churches c ON c.id = p.church_id
    WHERE
      (p_game_slug = 'all' OR s.game_slug = p_game_slug)
      AND (
        CASE
          WHEN p_scope = 'daily' THEN s.created_at >= date_trunc('day', now())
          WHEN p_scope = 'weekly' THEN s.created_at >= date_trunc('week', now())
          ELSE true
        END
      )
      AND (
        p_scope != 'church' OR (p_church_id IS NOT NULL AND p.church_id = p_church_id)
      )
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC) AS rank,
    user_id,
    display_name,
    avatar_url,
    badge,
    church_name,
    score,
    game_slug,
    created_at
  FROM filtered
  WHERE rn = 1
  ORDER BY score DESC, created_at ASC
  LIMIT 50;
$$;

-- 11. RPC: DAILY_SEED
CREATE OR REPLACE FUNCTION public.get_arcade_daily_seed(p_game_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_seed text;
  v_mult numeric := 2.0;
BEGIN
  SELECT seed, bonus_multiplier INTO v_seed, v_mult
  FROM public.arcade_daily
  WHERE game_slug = p_game_slug AND day = v_today;

  IF NOT FOUND THEN
    v_seed := 'seed-' || to_char(v_today, 'YYYYMMDD') || '-' || p_game_slug;
    INSERT INTO public.arcade_daily (game_slug, day, seed, bonus_multiplier)
    VALUES (p_game_slug, v_today, v_seed, 2.0)
    ON CONFLICT (game_slug, day) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'game_slug', p_game_slug,
    'day', v_today,
    'seed', v_seed,
    'bonus_multiplier', v_mult
  );
END;
$$;

-- 12. ROW LEVEL SECURITY
ALTER TABLE public.arcade_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_questions ENABLE ROW LEVEL SECURITY;

-- Games policies
DROP POLICY IF EXISTS "Public can view arcade games" ON public.arcade_games;
CREATE POLICY "Public can view arcade games"
  ON public.arcade_games FOR SELECT
  USING (true);

-- Scores policies (CLIENTS CAN NEVER INSERT DIRECTLY - must use API route / RPC)
DROP POLICY IF EXISTS "Public can view arcade scores" ON public.arcade_scores;
CREATE POLICY "Public can view arcade scores"
  ON public.arcade_scores FOR SELECT
  USING (true);

-- Daily challenge policies
DROP POLICY IF EXISTS "Public can view arcade daily" ON public.arcade_daily;
CREATE POLICY "Public can view arcade daily"
  ON public.arcade_daily FOR SELECT
  USING (true);

-- Progress policies
DROP POLICY IF EXISTS "Public can view arcade progress" ON public.arcade_progress;
CREATE POLICY "Public can view arcade progress"
  ON public.arcade_progress FOR SELECT
  USING (true);

-- Achievements policies
DROP POLICY IF EXISTS "Public can view arcade achievements" ON public.arcade_achievements;
CREATE POLICY "Public can view arcade achievements"
  ON public.arcade_achievements FOR SELECT
  USING (true);

-- Questions policies
DROP POLICY IF EXISTS "Public can view arcade questions" ON public.arcade_questions;
CREATE POLICY "Public can view arcade questions"
  ON public.arcade_questions FOR SELECT
  USING (true);

NOTIFY pgrst, 'reload schema';
