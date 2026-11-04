-- Allow members to toggle only their own profile-lock flag.
-- This column grant does not bypass RLS: the existing owner-scoped UPDATE
-- policy on public.profiles must still authorize the target row.
-- Do not grant role, badge, church ownership, or other security-sensitive fields.
-- Profile deletion is not a browser operation; account deletion belongs in a
-- trusted server-side workflow, so remove the unnecessary table-level grant.

BEGIN;

REVOKE DELETE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

GRANT UPDATE (is_locked) ON TABLE public.profiles TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
