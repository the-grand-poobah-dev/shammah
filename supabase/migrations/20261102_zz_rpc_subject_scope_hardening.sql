-- Scope SECURITY DEFINER relationship/admin helpers to the signed-in caller.
-- These functions are referenced by RLS policies, so keep EXECUTE available;
-- anonymous calls now return false rather than probing arbitrary users.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_following_user(
  p_follower_id uuid,
  p_followed_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $following$
  SELECT CASE
    WHEN auth.uid() IS NULL
      OR p_follower_id IS NULL
      OR p_follower_id <> auth.uid()
      OR p_followed_id IS NULL
      THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.follows AS f
      WHERE f.follower_id = p_follower_id
        AND f.followed_id = p_followed_id
    )
  END;
$following$;

CREATE OR REPLACE FUNCTION public.is_active_church_member(
  p_user_id uuid,
  p_church_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $church_member$
  SELECT CASE
    WHEN auth.uid() IS NULL
      OR p_user_id IS NULL
      OR p_user_id <> auth.uid()
      OR p_church_id IS NULL
      THEN false
    ELSE (
      EXISTS (
        SELECT 1
        FROM public.church_members AS cm
        WHERE cm.user_id = p_user_id
          AND cm.church_id = p_church_id::text
          AND cm.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = p_user_id
          AND p.church_id = p_church_id
      )
    )
  END;
$church_member$;

CREATE OR REPLACE FUNCTION public.is_church_admin(
  p_church_id text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $church_admin$
BEGIN
  IF auth.uid() IS NULL
     OR p_user_id IS NULL
     OR p_user_id <> auth.uid()
     OR p_church_id IS NULL
     OR btrim(p_church_id) = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.churches AS c
    WHERE c.id::text = p_church_id
      AND (
        c.created_by = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.profiles AS p
          WHERE p.id = p_user_id
            AND p.role = 'platform_admin'
        )
      )
  );
END;
$church_admin$;

-- Keep execute grants needed by RLS policies. Scope is enforced inside each
-- function, including for anon calls that can reach public-visibility policies.
REVOKE ALL ON FUNCTION public.is_following_user(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_church_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_church_admin(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_following_user(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_church_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_church_admin(text, uuid) TO anon, authenticated;

COMMIT;
