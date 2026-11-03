-- Prevent self-service profile edits from changing roles or security-sensitive state.
-- Row-level policies still restrict profile rows to the owner; these grants
-- further limit which columns an ordinary client may insert or update.

BEGIN;

REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

GRANT INSERT (
  id,
  display_name,
  avatar_url,
  cover_url,
  about,
  location_label,
  date_of_birth,
  church_name,
  allow_status_reshare
) ON TABLE public.profiles TO authenticated;

GRANT UPDATE (
  display_name,
  avatar_url,
  cover_url,
  about,
  location_label,
  date_of_birth,
  church_name,
  allow_status_reshare
) ON TABLE public.profiles TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
