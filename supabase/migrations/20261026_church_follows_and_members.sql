-- =============================================================================
-- Shammah Migration: Church Follows and Church Memberships Persistence
-- 1. Create public.church_follows table for public church feed following
-- 2. Create public.church_members table for formal church membership & approval
-- 3. Set up Row Level Security (RLS) with strict owner write and authenticated read
-- 4. RPC functions for counting followers and members
-- =============================================================================

-- 1. church_follows: Believers following church public updates
CREATE TABLE IF NOT EXISTS public.church_follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, church_id)
);

CREATE INDEX IF NOT EXISTS idx_church_follows_church_id ON public.church_follows(church_id);
CREATE INDEX IF NOT EXISTS idx_church_follows_user_id ON public.church_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_church_follows_created_at ON public.church_follows(created_at DESC);

-- 2. church_members: Believers joining church as active or pending members
CREATE TABLE IF NOT EXISTS public.church_members (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, church_id)
);

CREATE INDEX IF NOT EXISTS idx_church_members_church_id ON public.church_members(church_id);
CREATE INDEX IF NOT EXISTS idx_church_members_user_id ON public.church_members(user_id);
CREATE INDEX IF NOT EXISTS idx_church_members_status ON public.church_members(church_id, status);

-- 3. Grants & Privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.church_follows TO anon, authenticated;
GRANT INSERT, DELETE ON public.church_follows TO authenticated;
GRANT ALL PRIVILEGES ON public.church_follows TO postgres, service_role;

GRANT SELECT ON public.church_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.church_members TO authenticated;
GRANT ALL PRIVILEGES ON public.church_members TO postgres, service_role;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.church_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: church_follows
DROP POLICY IF EXISTS "Signed-in and public can read church follows" ON public.church_follows;
CREATE POLICY "Signed-in and public can read church follows"
  ON public.church_follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can follow churches as themselves" ON public.church_follows;
CREATE POLICY "Users can follow churches as themselves"
  ON public.church_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unfollow churches for themselves" ON public.church_follows;
CREATE POLICY "Users can unfollow churches for themselves"
  ON public.church_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. RLS Policies: church_members
DROP POLICY IF EXISTS "Signed-in and public can read church members" ON public.church_members;
CREATE POLICY "Signed-in and public can read church members"
  ON public.church_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can join churches as themselves" ON public.church_members;
CREATE POLICY "Users can join churches as themselves"
  ON public.church_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users or church admins can update memberships" ON public.church_members;
CREATE POLICY "Users or church admins can update memberships"
  ON public.church_members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.churches c
      WHERE c.id::text = church_id AND (c.created_by = auth.uid() OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'platform_admin'))
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.churches c
      WHERE c.id::text = church_id AND (c.created_by = auth.uid() OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'platform_admin'))
    )
  );

DROP POLICY IF EXISTS "Users can leave churches for themselves" ON public.church_members;
CREATE POLICY "Users can leave churches for themselves"
  ON public.church_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.churches c
      WHERE c.id::text = church_id AND (c.created_by = auth.uid() OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'platform_admin'))
    )
  );

-- 7. RPC Helper: batch follower and member counts
CREATE OR REPLACE FUNCTION public.church_follower_counts(p_church_ids text[])
RETURNS TABLE(church_id text, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT cf.church_id, COUNT(*)::bigint AS count
  FROM public.church_follows cf
  WHERE cf.church_id = ANY(p_church_ids)
  GROUP BY cf.church_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.church_follower_counts(text[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.church_active_member_counts(p_church_ids text[])
RETURNS TABLE(church_id text, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT cm.church_id, COUNT(*)::bigint AS count
  FROM public.church_members cm
  WHERE cm.church_id = ANY(p_church_ids) AND cm.status = 'active'
  GROUP BY cm.church_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.church_active_member_counts(text[]) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
