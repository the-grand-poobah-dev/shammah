-- Restrict church membership updates to church creators and platform admins.
-- Members must use the dedicated join/leave flows rather than editing their
-- own church_id or status directly.

BEGIN;

DROP POLICY IF EXISTS "Users can manage own church_members"
  ON public.church_members;

DROP POLICY IF EXISTS "Users or church admins can update memberships"
  ON public.church_members;

CREATE POLICY "Church admins can update memberships"
  ON public.church_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.churches c
      WHERE c.id::text = church_members.church_id
        AND (
          c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'platform_admin'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.churches c
      WHERE c.id::text = church_members.church_id
        AND (
          c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'platform_admin'
          )
        )
    )
  );

COMMIT;
