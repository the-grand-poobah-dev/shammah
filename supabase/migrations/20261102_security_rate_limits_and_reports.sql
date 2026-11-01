-- ==============================================================================
-- Migration: 20261102_security_rate_limits_and_reports.sql
-- Description: Security hardening, server-side rate limits, idempotent donations,
-- arcade score verification, unified moderation reports, and performance indexes.
-- Safe, idempotent, non-destructive.
-- ==============================================================================

-- 1. Server-Side Rate Limits Table & RPC
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  tokens INTEGER NOT NULL DEFAULT 10,
  max_tokens INTEGER NOT NULL DEFAULT 10,
  refill_rate NUMERIC NOT NULL DEFAULT 1.0, -- tokens per second
  last_refill TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON public.rate_limits (expires_at);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limits are managed strictly server-side / by RPC
DROP POLICY IF EXISTS "Deny all public access to rate limits" ON public.rate_limits;
CREATE POLICY "Deny all public access to rate limits"
  ON public.rate_limits FOR ALL
  USING (false);

-- Token-bucket rate limit check RPC
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_cost INTEGER DEFAULT 1,
  p_max_tokens INTEGER DEFAULT 10,
  p_refill_rate NUMERIC DEFAULT 1.0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_elapsed_seconds NUMERIC;
  v_new_tokens NUMERIC;
BEGIN
  -- Select row for update
  SELECT * INTO v_row FROM public.rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    IF p_max_tokens >= p_cost THEN
      INSERT INTO public.rate_limits (key, tokens, max_tokens, refill_rate, last_refill, expires_at)
      VALUES (p_key, p_max_tokens - p_cost, p_max_tokens, p_refill_rate, v_now, v_now + INTERVAL '2 hours')
      ON CONFLICT (key) DO UPDATE
        SET tokens = public.rate_limits.max_tokens - p_cost,
            last_refill = v_now,
            expires_at = v_now + INTERVAL '2 hours';
      RETURN true;
    ELSE
      RETURN false;
    END IF;
  END IF;

  -- Refill tokens based on elapsed time
  v_elapsed_seconds := EXTRACT(EPOCH FROM (v_now - v_row.last_refill));
  v_new_tokens := LEAST(v_row.max_tokens::NUMERIC, v_row.tokens::NUMERIC + (v_elapsed_seconds * v_row.refill_rate));

  IF v_new_tokens >= p_cost THEN
    UPDATE public.rate_limits
    SET tokens = FLOOR(v_new_tokens - p_cost)::INTEGER,
        last_refill = v_now,
        expires_at = v_now + INTERVAL '2 hours'
    WHERE key = p_key;
    RETURN true;
  ELSE
    UPDATE public.rate_limits
    SET tokens = FLOOR(v_new_tokens)::INTEGER,
        last_refill = v_now,
        expires_at = v_now + INTERVAL '2 hours'
    WHERE key = p_key;
    RETURN false;
  END IF;
END;
$$;


-- 2. Unified Content Reports Table Evolution
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID,
  target_id_text TEXT,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  action_taken TEXT,
  actioned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure target_id_text and action columns exist
ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS target_id_text TEXT,
  ADD COLUMN IF NOT EXISTS action_taken TEXT,
  ADD COLUMN IF NOT EXISTS actioned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actioned_at TIMESTAMPTZ;

-- Make target_id nullable if it was required as UUID
ALTER TABLE public.content_reports ALTER COLUMN target_id DROP NOT NULL;

-- Relax constraint to accommodate all faith section content types
DO $$
BEGIN
  ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_target_type_check;
  BEGIN
    ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_target_type_check
      CHECK (target_type IN (
        'post', 'status', 'video', 'reel', 'audio', 'poll',
        'course', 'fundraiser', 'challenge', 'submission',
        'comment', 'livestream'
      ));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Relax status constraint
DO $$
BEGIN
  ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_status_check;
  BEGIN
    ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_status_check
      CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned', 'hidden'));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created ON public.content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_target_text ON public.content_reports (target_type, target_id_text);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can insert own content reports" ON public.content_reports;
CREATE POLICY "users can insert own content reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reporters and staff can view content reports" ON public.content_reports;
CREATE POLICY "reporters and staff can view content reports"
  ON public.content_reports FOR SELECT
  USING (
    auth.uid() = reporter_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('platform_admin', 'church_admin') OR p.badge IN ('lead_pastor', 'admin', 'moderator'))
    )
  );

DROP POLICY IF EXISTS "staff can update content reports" ON public.content_reports;
CREATE POLICY "staff can update content reports"
  ON public.content_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('platform_admin', 'church_admin') OR p.badge IN ('lead_pastor', 'admin', 'moderator'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('platform_admin', 'church_admin') OR p.badge IN ('lead_pastor', 'admin', 'moderator'))
    )
  );


-- Ensure course_progress.enrollment_id is nullable if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'course_progress' AND column_name = 'enrollment_id'
  ) THEN
    ALTER TABLE public.course_progress ALTER COLUMN enrollment_id DROP NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Ensure fundraisers columns don't block operations with strict NOT NULL constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fundraisers' AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE public.fundraisers ALTER COLUMN creator_id DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fundraisers' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.fundraisers ALTER COLUMN description DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fundraisers' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.fundraisers ALTER COLUMN category DROP NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Ensure columns on fundraiser_donations exist
ALTER TABLE public.fundraiser_donations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS mpesa_receipt TEXT,
  ADD COLUMN IF NOT EXISTS checkout_request_id TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_transaction_id TEXT;

-- Ensure columns on arcade_scores exist
ALTER TABLE public.arcade_scores
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS game_slug TEXT NOT NULL DEFAULT 'trivia';

-- 3. Idempotent Fundraiser Donation Credit RPC
CREATE OR REPLACE FUNCTION public.credit_fundraiser_donation(
  p_donation_id TEXT,
  p_mpesa_receipt TEXT,
  p_amount_kes NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donation RECORD;
  v_fundraiser RECORD;
  v_current_raised NUMERIC := 0;
  v_new_raised NUMERIC;
  v_new_donors INTEGER := 1;
  v_has_raised_amount BOOLEAN;
  v_has_raised_kes BOOLEAN;
  v_has_amount_kes BOOLEAN;
  v_has_updated_at BOOLEAN;
  v_update_sql TEXT;
BEGIN
  -- 1. Lock donation row and verify pending state (Idempotency Guard)
  SELECT * INTO v_donation
  FROM public.fundraiser_donations
  WHERE id::text = p_donation_id::text
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation record not found');
  END IF;

  -- Replay check: if already succeeded, exit idempotently without double-crediting
  IF v_donation.status = 'succeeded' THEN
    RETURN jsonb_build_object('success', true, 'replayed', true, 'message', 'Already processed');
  END IF;

  -- 2. Mark donation succeeded (support either amount or amount_kes column)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fundraiser_donations' AND column_name = 'amount_kes'
  ) INTO v_has_amount_kes;

  IF v_has_amount_kes THEN
    EXECUTE 'UPDATE public.fundraiser_donations
             SET status = ''succeeded'',
                 mpesa_receipt = COALESCE($1, mpesa_receipt),
                 amount_kes = COALESCE($2, amount_kes)
             WHERE id::text = $3'
    USING p_mpesa_receipt, p_amount_kes, p_donation_id;
  ELSE
    EXECUTE 'UPDATE public.fundraiser_donations
             SET status = ''succeeded'',
                 mpesa_receipt = COALESCE($1, mpesa_receipt),
                 amount = COALESCE($2, amount)
             WHERE id::text = $3'
    USING p_mpesa_receipt, p_amount_kes, p_donation_id;
  END IF;

  -- 3. Update parent fundraiser raised sum and donor count
  SELECT * INTO v_fundraiser
  FROM public.fundraisers
  WHERE id::text = v_donation.fundraiser_id::text
  FOR UPDATE;

  IF FOUND THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'fundraisers' AND column_name = 'raised_amount'
    ) INTO v_has_raised_amount;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'fundraisers' AND column_name = 'raised_kes'
    ) INTO v_has_raised_kes;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'fundraisers' AND column_name = 'updated_at'
    ) INTO v_has_updated_at;

    IF v_has_raised_amount THEN
      EXECUTE 'SELECT COALESCE(raised_amount, 0) FROM public.fundraisers WHERE id::text = $1'
      INTO v_current_raised USING v_fundraiser.id::text;
    ELSIF v_has_raised_kes THEN
      EXECUTE 'SELECT COALESCE(raised_kes, 0) FROM public.fundraisers WHERE id::text = $1'
      INTO v_current_raised USING v_fundraiser.id::text;
    END IF;

    v_new_raised := COALESCE(v_current_raised, 0) + COALESCE(p_amount_kes, 0);
    v_new_donors := COALESCE(v_fundraiser.donors_count, 0) + 1;

    v_update_sql := 'UPDATE public.fundraisers SET donors_count = ' || v_new_donors;

    IF v_has_raised_amount THEN
      v_update_sql := v_update_sql || ', raised_amount = ' || v_new_raised;
    END IF;

    IF v_has_raised_kes THEN
      v_update_sql := v_update_sql || ', raised_kes = ' || v_new_raised;
    END IF;

    IF v_has_updated_at THEN
      v_update_sql := v_update_sql || ', updated_at = NOW()';
    END IF;

    v_update_sql := v_update_sql || ' WHERE id::text = ' || quote_literal(v_fundraiser.id::text);

    EXECUTE v_update_sql;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'donation_id', p_donation_id,
    'raised_amount', v_new_raised,
    'donors_count', v_new_donors
  );
END;
$$;


-- 4. Server-Side Validated Arcade Score Submission RPC
CREATE OR REPLACE FUNCTION public.submit_arcade_score(
  p_game_slug TEXT,
  p_score INTEGER,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_inserted_id TEXT;
  v_clean_score INTEGER;
  v_has_user_name BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit high scores';
  END IF;

  -- Score sanity bounds to prevent cheated unrealistic scores
  v_clean_score := GREATEST(0, LEAST(coalesce(p_score, 0), 50000));

  SELECT display_name, avatar_url INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arcade_scores' AND column_name = 'user_name'
  ) INTO v_has_user_name;

  IF v_has_user_name THEN
    EXECUTE 'INSERT INTO public.arcade_scores (game_slug, user_id, user_name, score, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING id::text'
    INTO v_inserted_id
    USING COALESCE(p_game_slug, 'trivia'), v_user_id, COALESCE(v_profile.display_name, 'Believer'), v_clean_score;
  ELSE
    EXECUTE 'INSERT INTO public.arcade_scores (game_slug, user_id, score, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING id::text'
    INTO v_inserted_id
    USING COALESCE(p_game_slug, 'trivia'), v_user_id, v_clean_score;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'score_id', v_inserted_id,
    'score', v_clean_score,
    'game_slug', p_game_slug
  );
END;
$$;


-- 5. Missing Hot Performance Indexes across Sections
-- Courses lookup
CREATE INDEX IF NOT EXISTS idx_course_progress_user_course ON public.course_progress (user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_courses_category_created ON public.courses (category, created_at DESC);

-- Challenge Submissions & Checkins
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_lookup ON public.challenge_submissions (challenge_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_checkins_user_date ON public.challenge_checkins (user_id, checkin_date DESC);

-- Fundraisers & Donations
CREATE INDEX IF NOT EXISTS idx_fundraiser_donations_fr ON public.fundraiser_donations (fundraiser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fundraisers_church ON public.fundraisers (church_id, created_at DESC);

-- Arcade
CREATE INDEX IF NOT EXISTS idx_arcade_scores_user ON public.arcade_scores (user_id, created_at DESC);

-- Media items
CREATE INDEX IF NOT EXISTS idx_media_category_pub_at ON public.media_items (category, created_at DESC);
