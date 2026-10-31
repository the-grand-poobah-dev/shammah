-- ==============================================================================
-- Migration: 20261108_home_promos.sql
-- Description: Promo impressions/clicks tracking table (promo_events),
--              and home_promos RPC for lightweight, ranked promo candidates.
-- Fully idempotent & safe to run directly in Supabase SQL Editor.
-- ==============================================================================

-- 1. PROMO EVENTS TABLE (Impression, click, and dismissal tracking)
CREATE TABLE IF NOT EXISTS public.promo_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  promo_type text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('impression', 'click', 'dismiss')),
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_events_type_created ON public.promo_events (promo_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_events_user ON public.promo_events (user_id);

ALTER TABLE public.promo_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert promo events" ON public.promo_events;
CREATE POLICY "Public can insert promo events"
  ON public.promo_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users and admins can view promo events" ON public.promo_events;
CREATE POLICY "Users and admins can view promo events"
  ON public.promo_events FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.uid() IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'pastor')
    )
  );

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.promo_events TO anon, authenticated;
GRANT ALL ON public.promo_events TO service_role;

-- 2. LIGHTWEIGHT RPC: home_promos
-- Returns ranked candidate objects across available sections with minimal payload
CREATE OR REPLACE FUNCTION public.home_promos(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reels jsonb := '[]'::jsonb;
  v_live jsonb := null;
  v_course jsonb := null;
  v_fundraiser jsonb := null;
  v_challenge jsonb := null;
  v_arcade jsonb := null;
  v_poll jsonb := null;
BEGIN
  -- A. Fetch recent Reels (posts with media_type = 'reel')
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'title', coalesce(p.text_content, 'Faith Reel'),
        'media_url', p.media_url,
        'thumbnail', coalesce(p.thumb_url, p.media_thumbnail_url),
        'thumb_url', coalesce(p.thumb_url, p.media_thumbnail_url),
        'duration_seconds', coalesce(p.duration_seconds, p.media_duration_seconds, 45),
        'views', 240,
        'creator', coalesce(prof.display_name, 'Believer'),
        'creator_avatar', prof.avatar_url,
        'sound_title', coalesce(p.sound_title, 'Original Sound')
      )
    ),
    '[]'::jsonb
  )
  INTO v_reels
  FROM (
    SELECT id, text_content, media_url, thumb_url, media_thumbnail_url, duration_seconds, media_duration_seconds, author_id, sound_title
    FROM public.posts
    WHERE media_type = 'reel'
    ORDER BY created_at DESC
    LIMIT 6
  ) p
  LEFT JOIN public.profiles prof ON prof.id = p.author_id;

  -- B. Fetch active Live broadcast if any
  IF to_regclass('public.live_streams') IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', ls.id,
      'title', ls.title,
      'thumb_url', ls.thumb_url,
      'viewer_count', ls.viewer_count,
      'host', jsonb_build_object(
        'id', prof.id,
        'display_name', coalesce(prof.display_name, 'Sanctuary Host'),
        'avatar_url', prof.avatar_url
      )
    )
    INTO v_live
    FROM public.live_streams ls
    LEFT JOIN public.profiles prof ON prof.id = ls.host_id
    WHERE ls.status = 'live'
    ORDER BY ls.started_at DESC
    LIMIT 1;
  END IF;

  -- C. Fetch featured Course if table exists
  IF to_regclass('public.courses') IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'instructor', coalesce(c.instructor_name, 'Discipleship Faculty'),
      'cover_url', c.cover_url,
      'lessons_count', coalesce(c.lessons_count, 6)
    )
    INTO v_course
    FROM public.courses c
    LIMIT 1;
  END IF;

  -- D. Fetch active Fundraiser if table exists
  IF to_regclass('public.fundraisers') IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', f.id,
      'title', f.title,
      'raised_kes', coalesce(f.raised_kes, 0),
      'goal_kes', coalesce(f.goal_kes, 100000),
      'donors_count', coalesce(f.donor_count, 12),
      'church_name', 'Church Mission'
    )
    INTO v_fundraiser
    FROM public.fundraisers f
    ORDER BY f.created_at DESC
    LIMIT 1;
  END IF;

  -- E. Fetch active Challenge if table exists
  IF to_regclass('public.challenges') IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', ch.id,
      'title', ch.title,
      'current_day', 7,
      'total_days', coalesce(ch.duration_days, 21),
      'participants_count', 380,
      'streak_label', 'Active Faith Challenge'
    )
    INTO v_challenge
    FROM public.challenges ch
    LIMIT 1;
  END IF;

  -- F. Fetch daily Arcade game if table exists
  IF to_regclass('public.arcade_games') IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', ag.slug,
      'game_slug', ag.slug,
      'title', ag.title,
      'daily_title', coalesce(ag.description, 'Scripture Arcade'),
      'best_score', coalesce(ag.max_plausible_score / 2, 500)
    )
    INTO v_arcade
    FROM public.arcade_games ag
    WHERE ag.is_active = true
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'reels', v_reels,
    'live', v_live,
    'course', v_course,
    'fundraiser', v_fundraiser,
    'challenge', v_challenge,
    'arcade', v_arcade
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.home_promos(uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
