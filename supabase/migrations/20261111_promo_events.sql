-- Lightweight analytics for cross-promotion widgets. Content discovery remains usable if this migration is not applied.
CREATE TABLE IF NOT EXISTS public.promo_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_type text NOT NULL CHECK (promo_type IN ('live','course','fundraiser','challenge','verse','audio','poll','arcade','reel')),
  promo_id text,
  event_type text NOT NULL CHECK (event_type IN ('impression','click','dismiss')),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reconcile the earlier promo_events shape if it already exists in this project.
ALTER TABLE public.promo_events ADD COLUMN IF NOT EXISTS promo_id text;
ALTER TABLE public.promo_events ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.promo_events DROP CONSTRAINT IF EXISTS promo_events_promo_type_check;
ALTER TABLE public.promo_events ADD CONSTRAINT promo_events_promo_type_check
  CHECK (promo_type IN ('live','course','fundraiser','challenge','verse','audio','poll','arcade','reel'));
ALTER TABLE public.promo_events DROP CONSTRAINT IF EXISTS promo_events_event_type_check;
ALTER TABLE public.promo_events ADD CONSTRAINT promo_events_event_type_check
  CHECK (event_type IN ('impression','click','dismiss'));
ALTER TABLE public.promo_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.promo_events FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.promo_events TO anon, authenticated;
GRANT SELECT ON public.promo_events TO authenticated;
DROP POLICY IF EXISTS "Public can insert promo events" ON public.promo_events;
DROP POLICY IF EXISTS "Users and admins can view promo events" ON public.promo_events;
DROP POLICY IF EXISTS promo_events_insert_any ON public.promo_events;
CREATE POLICY promo_events_insert_any ON public.promo_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS promo_events_admin_read ON public.promo_events;
CREATE POLICY promo_events_admin_read ON public.promo_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','platform_admin','superadmin')
    )
  );

CREATE INDEX IF NOT EXISTS promo_events_created_at_idx ON public.promo_events (created_at DESC);
CREATE INDEX IF NOT EXISTS promo_events_type_created_at_idx ON public.promo_events (promo_type, created_at DESC);
