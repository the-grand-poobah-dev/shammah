-- Harden profile confidentiality while retaining public profile-card access.
-- Precise location metadata is copied to owner-only profile_private; the legacy
-- columns remain temporarily for compatibility but are not selectable via Data API.

ALTER TABLE public.profile_private
  ADD COLUMN IF NOT EXISTS location_place_id text,
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision;

-- Preserve any existing location values while keeping DOB untouched.
INSERT INTO public.profile_private (id, location_place_id, location_lat, location_lng)
SELECT id, location_place_id, location_lat, location_lng
FROM public.profiles
WHERE location_place_id IS NOT NULL
   OR location_lat IS NOT NULL
   OR location_lng IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET location_place_id = COALESCE(EXCLUDED.location_place_id, profile_private.location_place_id),
    location_lat = COALESCE(EXCLUDED.location_lat, profile_private.location_lat),
    location_lng = COALESCE(EXCLUDED.location_lng, profile_private.location_lng);

-- Keep DOB validation and round precise coordinates before they are stored.
CREATE OR REPLACE FUNCTION public.check_dob()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    IF NEW.date_of_birth < DATE '1900-01-01' OR NEW.date_of_birth > CURRENT_DATE THEN
      RAISE EXCEPTION 'Please enter a valid date of birth.';
    END IF;
    IF NEW.date_of_birth > (CURRENT_DATE - INTERVAL '13 years')::date THEN
      RAISE EXCEPTION 'You must be at least 13 years old to join Shammah.';
    END IF;
  END IF;

  IF NEW.location_lat IS NOT NULL THEN
    NEW.location_lat := round(NEW.location_lat::numeric, 2);
  END IF;
  IF NEW.location_lng IS NOT NULL THEN
    NEW.location_lng := round(NEW.location_lng::numeric, 2);
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Remove broad table-level and any prior column-level SELECT grants. Then
-- allow only the profile fields the public UI is designed to display.
REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE SELECT (
  id, display_name, role, church_id, created_at, badge, badge_verified,
  avatar_url, cover_url, about, location_label, location_place_id,
  location_lat, location_lng, display_name_changed_at, onboarding_completed_at,
  date_of_birth, location_name, onboarded_at, badge_set_at, is_locked,
  inbox_permission, church_name, theme_preference, allow_status_reshare,
  who_can_tag_me, review_tags
) ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id, display_name, role, church_id, created_at, badge, badge_verified,
  avatar_url, cover_url, about, location_label, display_name_changed_at,
  onboarding_completed_at, onboarded_at, badge_set_at, is_locked,
  inbox_permission, church_name, theme_preference, allow_status_reshare,
  who_can_tag_me, review_tags
) ON TABLE public.profiles TO anon, authenticated;

-- Private table remains owner-only under its existing RLS policies.
REVOKE ALL PRIVILEGES ON TABLE public.profile_private FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profile_private TO authenticated;

NOTIFY pgrst, 'reload schema';
