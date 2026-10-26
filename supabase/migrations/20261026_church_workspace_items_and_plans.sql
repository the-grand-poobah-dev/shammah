-- =============================================================================
-- Shammah Migration: Church Workspace Shared Items & Workspace Premium Plan Gating
-- 1. church_has_workspace_plan function checking subscriptions & church entitlement
-- 2. church_workspace_items table (forms, events, meet, classroom, slides, etc.)
-- 3. Row Level Security: public/members/followers visibility reads; admin-only writes
--    strictly guarded by church_has_workspace_plan(church_id).
-- =============================================================================

-- 1. Helper function: verify if caller is admin of the target church
CREATE OR REPLACE FUNCTION public.is_church_admin(p_church_id text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_church_id IS NULL OR btrim(p_church_id) = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.churches c
    WHERE c.id::text = p_church_id
      AND (
        c.created_by = p_user_id
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = p_user_id AND p.role = 'platform_admin'
        )
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_church_admin(text, uuid) TO anon, authenticated, service_role;

-- 2. Database function: verify if a church has an active Workspace plan
CREATE OR REPLACE FUNCTION public.church_has_workspace_plan(p_church_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_active_sub boolean := false;
BEGIN
  IF p_church_id IS NULL OR btrim(p_church_id) = '' THEN
    RETURN false;
  END IF;

  -- A. Check subscriptions table for an active/confirmed workspace plan
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.church_id::text = p_church_id
      AND s.status IN ('confirmed', 'active')
      AND (s.plan_id = 'workspace_premium' OR s.plan_id IS NOT NULL)
      AND (s.period_ends_at IS NULL OR s.period_ends_at > now())
  ) INTO v_has_active_sub;

  IF v_has_active_sub THEN
    RETURN true;
  END IF;

  -- B. Check if church was granted active status by platform admin
  SELECT EXISTS (
    SELECT 1 FROM public.churches c
    WHERE c.id::text = p_church_id
      AND c.subscription_status = 'active'
      AND (c.subscription_plan = 'workspace_premium' OR c.subscription_plan IN ('advanced', 'popular'))
  ) INTO v_has_active_sub;

  RETURN coalesce(v_has_active_sub, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.church_has_workspace_plan(text) TO anon, authenticated, service_role;

-- 3. Create church_workspace_items table
CREATE TABLE IF NOT EXISTS public.church_workspace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id text NOT NULL,
  kind text NOT NULL CHECK (
    kind IN (
      'form',
      'calendar_event',
      'meet',
      'classroom',
      'drive_file',
      'doc',
      'sheet',
      'slide',
      'task_list',
      'chat_space'
    )
  ),
  title text NOT NULL,
  description text,
  google_id text,
  share_url text NOT NULL,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'members', 'followers')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cwi_church_id ON public.church_workspace_items(church_id);
CREATE INDEX IF NOT EXISTS idx_cwi_kind ON public.church_workspace_items(kind);
CREATE INDEX IF NOT EXISTS idx_cwi_visibility ON public.church_workspace_items(visibility);
CREATE INDEX IF NOT EXISTS idx_cwi_created_at ON public.church_workspace_items(created_at DESC);

-- 4. Grants & Privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.church_workspace_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.church_workspace_items TO authenticated;
GRANT ALL PRIVILEGES ON public.church_workspace_items TO postgres, service_role;

-- 5. Enable Row Level Security
ALTER TABLE public.church_workspace_items ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- SELECT: readable according to visibility
--   'public' -> readable by anyone
--   'members' -> church members (status = 'active') or church admin
--   'followers' -> church followers, church members, or church admin
DROP POLICY IF EXISTS "Workspace items read policy by visibility" ON public.church_workspace_items;
CREATE POLICY "Workspace items read policy by visibility"
  ON public.church_workspace_items FOR SELECT
  USING (
    visibility = 'public'
    OR (
      auth.uid() IS NOT NULL
      AND (
        public.is_church_admin(church_id, auth.uid())
        OR (
          visibility = 'members'
          AND EXISTS (
            SELECT 1 FROM public.church_members cm
            WHERE cm.church_id = public.church_workspace_items.church_id
              AND cm.user_id = auth.uid()
              AND cm.status = 'active'
          )
        )
        OR (
          visibility = 'followers'
          AND (
            EXISTS (
              SELECT 1 FROM public.church_follows cf
              WHERE cf.church_id = public.church_workspace_items.church_id
                AND cf.user_id = auth.uid()
            )
            OR EXISTS (
              SELECT 1 FROM public.church_members cm
              WHERE cm.church_id = public.church_workspace_items.church_id
                AND cm.user_id = auth.uid()
                AND cm.status = 'active'
            )
          )
        )
      )
    )
  );

-- INSERT: only church admin AND church has active workspace plan
DROP POLICY IF EXISTS "Church admins with active plan can create workspace items" ON public.church_workspace_items;
CREATE POLICY "Church admins with active plan can create workspace items"
  ON public.church_workspace_items FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.is_church_admin(church_id, auth.uid())
    AND public.church_has_workspace_plan(church_id)
  );

-- UPDATE: only church admin AND church has active workspace plan
DROP POLICY IF EXISTS "Church admins with active plan can update workspace items" ON public.church_workspace_items;
CREATE POLICY "Church admins with active plan can update workspace items"
  ON public.church_workspace_items FOR UPDATE
  TO authenticated
  USING (
    public.is_church_admin(church_id, auth.uid())
    AND public.church_has_workspace_plan(church_id)
  )
  WITH CHECK (
    public.is_church_admin(church_id, auth.uid())
    AND public.church_has_workspace_plan(church_id)
  );

-- DELETE: only church admin AND church has active workspace plan
DROP POLICY IF EXISTS "Church admins with active plan can delete workspace items" ON public.church_workspace_items;
CREATE POLICY "Church admins with active plan can delete workspace items"
  ON public.church_workspace_items FOR DELETE
  TO authenticated
  USING (
    public.is_church_admin(church_id, auth.uid())
    AND public.church_has_workspace_plan(church_id)
  );

NOTIFY pgrst, 'reload schema';
