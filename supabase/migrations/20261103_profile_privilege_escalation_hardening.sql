-- Prevent self-service profile edits from changing roles or security-sensitive state.
-- Row-level policies restrict profile rows to the owner; column grants further
-- limit which profile fields ordinary clients may insert or update.

BEGIN;

REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- Column grants survive table-level REVOKE, so clear all existing per-column
-- write grants before re-granting the small set of user-editable fields.
REVOKE INSERT (
  id, display_name, role, church_id, created_at, badge, badge_verified,
  avatar_url, cover_url, about, location_label, location_place_id,
  location_lat, location_lng, display_name_changed_at, onboarding_completed_at,
  date_of_birth, location_name, onboarded_at, badge_set_at, is_locked,
  inbox_permission, church_name, theme_preference, allow_status_reshare,
  who_can_tag_me, review_tags
) ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

REVOKE UPDATE (
  id, display_name, role, church_id, created_at, badge, badge_verified,
  avatar_url, cover_url, about, location_label, location_place_id,
  location_lat, location_lng, display_name_changed_at, onboarding_completed_at,
  date_of_birth, location_name, onboarded_at, badge_set_at, is_locked,
  inbox_permission, church_name, theme_preference, allow_status_reshare,
  who_can_tag_me, review_tags
) ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

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
