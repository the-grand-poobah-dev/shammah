-- Faith Challenges hardening: server-verified actions, privacy, badge milestones.
-- Idempotent. Run after the existing challenge tables/functions have been created.

BEGIN;

ALTER TABLE public.challenge_submissions
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';
ALTER TABLE public.challenge_submissions
  DROP CONSTRAINT IF EXISTS challenge_submissions_media_type_check;
ALTER TABLE public.challenge_submissions
  ADD CONSTRAINT challenge_submissions_media_type_check CHECK (media_type IN ('image','video'));

CREATE TABLE IF NOT EXISTS public.push_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL CHECK (length(token) BETWEEN 20 AND 4096),
  platform text NOT NULL DEFAULT 'web' CHECK (platform IN ('web','android','ios')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);
CREATE INDEX IF NOT EXISTS push_device_tokens_user_enabled_idx
  ON public.push_device_tokens (user_id, enabled);

ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_tokens_select_own" ON public.push_device_tokens;
DROP POLICY IF EXISTS "push_tokens_insert_own" ON public.push_device_tokens;
DROP POLICY IF EXISTS "push_tokens_update_own" ON public.push_device_tokens;
DROP POLICY IF EXISTS "push_tokens_delete_own" ON public.push_device_tokens;
CREATE POLICY "push_tokens_select_own" ON public.push_device_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_tokens_insert_own" ON public.push_device_tokens
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_tokens_update_own" ON public.push_device_tokens
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_tokens_delete_own" ON public.push_device_tokens
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.challenge_badge_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  badge_code text NOT NULL CHECK (badge_code IN ('spiritual_spark','steadfast_believer','overcomer_in_christ','kingdom_champion')),
  streak_days integer NOT NULL CHECK (streak_days IN (3,7,21,40)),
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, badge_code)
);

CREATE INDEX IF NOT EXISTS challenge_participants_points_idx
  ON public.challenge_participants (challenge_id, points DESC, streak_best DESC);
CREATE INDEX IF NOT EXISTS challenge_checkins_user_day_idx
  ON public.challenge_checkins (user_id, day DESC);
CREATE INDEX IF NOT EXISTS challenge_submissions_trending_idx
  ON public.challenge_submissions (status, like_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS challenge_submissions_challenge_idx
  ON public.challenge_submissions (challenge_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS challenge_votes_user_idx
  ON public.challenge_votes (user_id, submission_id);
CREATE INDEX IF NOT EXISTS challenge_badge_awards_user_idx
  ON public.challenge_badge_awards (user_id, earned_at DESC);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_badge_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Authenticated users can create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Challenges readable by all" ON public.challenges;
DROP POLICY IF EXISTS "Creators and admins can update challenges" ON public.challenges;
DROP POLICY IF EXISTS "Public can view challenges" ON public.challenges;
DROP POLICY IF EXISTS "challenge_public_read" ON public.challenges;
DROP POLICY IF EXISTS "challenge_owner_update" ON public.challenges;

CREATE POLICY "challenge_public_read" ON public.challenges
  FOR SELECT TO anon, authenticated
  USING (
    (status IN ('active','completed') AND visibility = 'public')
    OR creator_id = auth.uid()
    OR (
      visibility = 'church'
      AND church_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.church_id = challenges.church_id)
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','platform_admin','moderator'))
  );

DROP POLICY IF EXISTS "Public can view challenge participants" ON public.challenge_participants;
DROP POLICY IF EXISTS "Users can manage own participation" ON public.challenge_participants;
DROP POLICY IF EXISTS "challenge_participants_read" ON public.challenge_participants;
CREATE POLICY "challenge_participants_read" ON public.challenge_participants
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Challenge checkins readable by all" ON public.challenge_checkins;
DROP POLICY IF EXISTS "Public can view checkins" ON public.challenge_checkins;
DROP POLICY IF EXISTS "Users can create own checkins" ON public.challenge_checkins;
DROP POLICY IF EXISTS "Users can insert own challenge checkin" ON public.challenge_checkins;
DROP POLICY IF EXISTS "challenge_checkins_read_own" ON public.challenge_checkins;
CREATE POLICY "challenge_checkins_read_own" ON public.challenge_checkins
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','platform_admin','moderator'))
  );

DROP POLICY IF EXISTS "Challenge submissions readable by all" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Public can view approved submissions" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Users and moderators can delete submissions" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Users can create challenge submissions" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Users can insert own challenge submission" ON public.challenge_submissions;
DROP POLICY IF EXISTS "challenge_submissions_read" ON public.challenge_submissions;
DROP POLICY IF EXISTS "challenge_submissions_delete" ON public.challenge_submissions;
CREATE POLICY "challenge_submissions_read" ON public.challenge_submissions
  FOR SELECT TO anon, authenticated USING (
    status = 'approved'
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_submissions.challenge_id AND c.creator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','platform_admin','moderator'))
  );
CREATE POLICY "challenge_submissions_delete" ON public.challenge_submissions
  FOR DELETE TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_submissions.challenge_id AND c.creator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','platform_admin','moderator'))
  );

DROP POLICY IF EXISTS "Public can view votes" ON public.challenge_votes;
DROP POLICY IF EXISTS "Users can manage own votes" ON public.challenge_votes;
DROP POLICY IF EXISTS "challenge_votes_read_own" ON public.challenge_votes;
CREATE POLICY "challenge_votes_read_own" ON public.challenge_votes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "challenge_badge_awards_read_own" ON public.challenge_badge_awards;
CREATE POLICY "challenge_badge_awards_read_own" ON public.challenge_badge_awards
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','platform_admin','moderator'))
  );

CREATE OR REPLACE FUNCTION public.join_challenge(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_challenge public.challenges%ROWTYPE;
  v_part public.challenge_participants%ROWTYPE;
  v_church uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be signed in to join.');
  END IF;

  SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found.');
  END IF;
  IF v_challenge.status <> 'active' OR v_challenge.starts_at > now()
     OR (v_challenge.ends_at IS NOT NULL AND v_challenge.ends_at < now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This challenge is not currently accepting participants.');
  END IF;

  SELECT church_id INTO v_church FROM public.profiles WHERE id = v_uid;
  IF v_challenge.visibility = 'private' AND v_challenge.creator_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'This challenge is private.');
  END IF;
  IF v_challenge.visibility = 'church' AND v_challenge.creator_id IS DISTINCT FROM v_uid
     AND (v_challenge.church_id IS NULL OR v_challenge.church_id IS DISTINCT FROM v_church) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This challenge is only available to its church community.');
  END IF;

  INSERT INTO public.challenge_participants (challenge_id, user_id, joined_at, streak_current, streak_best, points)
  VALUES (p_challenge_id, v_uid, now(), 0, 0, 0)
  ON CONFLICT (challenge_id, user_id) DO NOTHING;

  UPDATE public.challenges
  SET participants_count = (SELECT count(*)::int FROM public.challenge_participants WHERE challenge_id = p_challenge_id),
      updated_at = now()
  WHERE id = p_challenge_id;

  SELECT * INTO v_part FROM public.challenge_participants
  WHERE challenge_id = p_challenge_id AND user_id = v_uid;

  RETURN jsonb_build_object('success', true, 'participant', to_jsonb(v_part));
END;
$function$;

CREATE OR REPLACE FUNCTION public.checkin(p_challenge_id uuid, p_note text DEFAULT NULL, p_media_url text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := CURRENT_DATE;
  v_part public.challenge_participants%ROWTYPE;
  v_challenge public.challenges%ROWTYPE;
  v_new_streak integer;
  v_best_streak integer;
  v_points integer := 10;
  v_badge_code text := NULL;
  v_badge_label text := NULL;
  v_church uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be signed in to check in.');
  END IF;
  IF length(coalesce(p_note,'')) > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Check-in note is too long.');
  END IF;
  IF p_media_url IS NOT NULL AND (length(p_media_url) > 2048 OR p_media_url !~* '^https?://') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Check-in media URL is invalid.');
  END IF;

  SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found.');
  END IF;
  IF v_challenge.status <> 'active' OR v_challenge.starts_at > now()
     OR (v_challenge.ends_at IS NOT NULL AND v_challenge.ends_at < now()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This challenge is not currently accepting check-ins.');
  END IF;
  SELECT church_id INTO v_church FROM public.profiles WHERE id = v_uid;
  IF v_challenge.visibility = 'private' AND v_challenge.creator_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'This challenge is private.');
  END IF;
  IF v_challenge.visibility = 'church' AND v_challenge.creator_id IS DISTINCT FROM v_uid
     AND (v_challenge.church_id IS NULL OR v_challenge.church_id IS DISTINCT FROM v_church) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This challenge is only available to its church community.');
  END IF;

  INSERT INTO public.challenge_participants (challenge_id, user_id, joined_at, streak_current, streak_best, points)
  VALUES (p_challenge_id, v_uid, now(), 0, 0, 0)
  ON CONFLICT (challenge_id, user_id) DO NOTHING;

  SELECT * INTO v_part FROM public.challenge_participants
  WHERE challenge_id = p_challenge_id AND user_id = v_uid FOR UPDATE;

  IF v_part.last_checkin_on = v_today OR EXISTS (
    SELECT 1 FROM public.challenge_checkins
    WHERE challenge_id = p_challenge_id AND user_id = v_uid AND (day = v_today OR checkin_date = v_today)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already checked in for today. Keep the flame burning tomorrow.',
      'streak_current', v_part.streak_current, 'streak_best', v_part.streak_best);
  END IF;

  IF v_part.last_checkin_on = v_today - 1 THEN
    v_new_streak := coalesce(v_part.streak_current, 0) + 1;
  ELSE
    v_new_streak := 1;
  END IF;
  v_best_streak := greatest(coalesce(v_part.streak_best, 0), v_new_streak);

  IF v_new_streak = 3 THEN
    v_points := v_points + 15;
    v_badge_code := 'spiritual_spark';
    v_badge_label := 'Spiritual Spark';
  ELSIF v_new_streak = 7 THEN
    v_points := v_points + 35;
    v_badge_code := 'steadfast_believer';
    v_badge_label := 'Steadfast Believer';
  ELSIF v_new_streak = 21 THEN
    v_points := v_points + 100;
    v_badge_code := 'overcomer_in_christ';
    v_badge_label := 'Overcomer in Christ';
  ELSIF v_new_streak = 40 THEN
    v_points := v_points + 250;
    v_badge_code := 'kingdom_champion';
    v_badge_label := 'Kingdom Champion';
  END IF;

  INSERT INTO public.challenge_checkins (challenge_id, user_id, day, checkin_date, note, reflection, media_url, points_awarded)
  VALUES (p_challenge_id, v_uid, v_today, v_today, nullif(btrim(p_note),''), nullif(btrim(p_note),''), p_media_url, v_points);

  UPDATE public.challenge_participants
  SET streak_current = v_new_streak, streak_best = v_best_streak, last_checkin_on = v_today,
      points = coalesce(points,0) + v_points
  WHERE challenge_id = p_challenge_id AND user_id = v_uid;

  IF v_badge_code IS NOT NULL THEN
    INSERT INTO public.challenge_badge_awards (user_id, challenge_id, badge_code, streak_days)
    VALUES (v_uid, p_challenge_id, v_badge_code, v_new_streak)
    ON CONFLICT (user_id, challenge_id, badge_code) DO NOTHING;
  END IF;

  UPDATE public.challenges
  SET participants_count = (SELECT count(*)::int FROM public.challenge_participants WHERE challenge_id = p_challenge_id),
      updated_at = now()
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object('success', true, 'day', v_today, 'streak_current', v_new_streak,
    'streak_best', v_best_streak, 'points_awarded', v_points, 'badge_awarded', v_badge_label);
END;
$function$;

CREATE OR REPLACE FUNCTION public.vote_submission(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_submission public.challenge_submissions%ROWTYPE;
  v_voted boolean;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be signed in to vote.');
  END IF;
  SELECT * INTO v_submission FROM public.challenge_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND OR v_submission.status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This submission is not available for voting.');
  END IF;
  IF v_submission.user_id = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot vote for your own submission.');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = v_submission.challenge_id
      AND (
        (c.status IN ('active','completed') AND c.visibility = 'public')
        OR c.creator_id = v_uid
        OR (c.visibility = 'church' AND c.church_id = (SELECT church_id FROM public.profiles WHERE id = v_uid))
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.role IN ('admin','platform_admin','moderator'))
      )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot vote in this challenge.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.challenge_votes WHERE submission_id = p_submission_id AND user_id = v_uid) THEN
    DELETE FROM public.challenge_votes WHERE submission_id = p_submission_id AND user_id = v_uid;
    v_voted := false;
  ELSE
    INSERT INTO public.challenge_votes (submission_id, user_id) VALUES (p_submission_id, v_uid);
    v_voted := true;
  END IF;

  SELECT count(*)::int INTO v_count FROM public.challenge_votes WHERE submission_id = p_submission_id;
  UPDATE public.challenge_submissions SET like_count = v_count, votes_count = v_count WHERE id = p_submission_id;
  RETURN jsonb_build_object('success', true, 'voted', v_voted, 'like_count', v_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.challenge_leaderboard(p_challenge_id uuid, p_scope text DEFAULT 'all')
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, badge text, points integer, streak_current integer, streak_best integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.badge,
    CASE WHEN lower(coalesce(p_scope,'all')) = 'week'
      THEN coalesce(sum(cc.points_awarded) FILTER (WHERE cc.day >= date_trunc('week', CURRENT_DATE)::date), 0)::integer
      ELSE cp.points END AS points,
    cp.streak_current,
    cp.streak_best
  FROM public.challenge_participants cp
  JOIN public.profiles p ON p.id = cp.user_id
  LEFT JOIN public.challenge_checkins cc
    ON cc.challenge_id = cp.challenge_id AND cc.user_id = cp.user_id
  WHERE cp.challenge_id = p_challenge_id
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = cp.challenge_id
        AND (
          (c.status IN ('active','completed') AND c.visibility = 'public')
          OR c.creator_id = auth.uid()
          OR (c.visibility = 'church' AND c.church_id = (SELECT church_id FROM public.profiles WHERE id = auth.uid()))
          OR EXISTS (SELECT 1 FROM public.profiles viewer WHERE viewer.id = auth.uid() AND viewer.role IN ('admin','platform_admin','moderator'))
        )
    )
    AND (
      lower(coalesce(p_scope,'all')) <> 'church'
      OR p.church_id = (SELECT church_id FROM public.profiles WHERE id = auth.uid())
    )
  GROUP BY p.id, p.display_name, p.avatar_url, p.badge, cp.points, cp.streak_current, cp.streak_best
  ORDER BY points DESC, cp.streak_best DESC, cp.streak_current DESC
  LIMIT 50;
$function$;

CREATE OR REPLACE FUNCTION public.award_points(p_challenge_id uuid, p_user_id uuid, p_points integer, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_role text;
  v_new_points integer;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF auth.role() <> 'service_role' AND coalesce(v_role,'') NOT IN ('admin','platform_admin','moderator') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to award points.');
  END IF;
  IF p_points IS NULL OR p_points < 1 OR p_points > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Points must be between 1 and 10000.');
  END IF;
  UPDATE public.challenge_participants
  SET points = points + p_points
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id
  RETURNING points INTO v_new_points;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Participant not found.');
  END IF;
  RETURN jsonb_build_object('success', true, 'points', v_new_points, 'reason', left(coalesce(p_reason,''),120));
END;
$function$;

REVOKE ALL ON FUNCTION public.join_challenge(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.checkin(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vote_submission(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.challenge_leaderboard(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.award_points(uuid,uuid,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_challenge(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.checkin(uuid,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vote_submission(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.challenge_leaderboard(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_points(uuid,uuid,integer,text) TO authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE ON public.challenges FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.challenge_participants FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.challenge_checkins FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.challenge_submissions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.challenge_votes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.challenge_badge_awards FROM anon, authenticated;

COMMIT;
