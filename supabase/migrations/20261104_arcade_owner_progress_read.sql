-- Let signed-in members read only their own Arcade progress and earned badges.
-- Score writes remain server-side through submit_arcade_score; no client write
-- policies are added here.

BEGIN;

ALTER TABLE public.arcade_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS arcade_progress_read_own ON public.arcade_progress;
CREATE POLICY arcade_progress_read_own
  ON public.arcade_progress
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS arcade_achievements_read_own ON public.arcade_achievements;
CREATE POLICY arcade_achievements_read_own
  ON public.arcade_achievements
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON TABLE public.arcade_progress TO authenticated;
GRANT SELECT ON TABLE public.arcade_achievements TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
