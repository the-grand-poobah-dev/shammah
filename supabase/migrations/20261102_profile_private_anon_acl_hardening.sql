-- Remove accidental anonymous access to private profile data.
-- profile_private has owner-only RLS, but its ACL currently also grants anon
-- table access. Keep authenticated access; the owner-only policies remain the
-- row-level authorization boundary. Do not grant DELETE.
REVOKE ALL PRIVILEGES ON TABLE public.profile_private FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.profile_private TO authenticated;

NOTIFY pgrst, 'reload schema';
