-- Harden profile confidentiality while retaining public profile-card access.
-- Precise location metadata is copied to owner-only profile_private; the legacy
-- columns remain temporarily for compatibility but are not selectable via Data API.

ALTER TABLE public.profile_private
  ADD COLUMN IF NOT EXISTS location_place_id text,
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision,
  ADD COLUMN IF NOT EXISTS inbox_permission text,
  ADD COLUMN IF NOT EXISTS theme_preference text,
  ADD COLUMN IF NOT EXISTS who_can_tag_me text,
  ADD COLUMN IF NOT EXISTS review_tags boolean;

-- Migrate legacy private preferences only when the new private-table value is
-- still NULL, so re-running this migration never overwrites a saved preference.
INSERT INTO public.profile_private (
  id, location_place_id, location_lat, location_lng,
  inbox_permission, theme_preference, who_can_tag_me, review_tags
)
SELECT
  id, location_place_id, location_lat, location_lng,
  inbox_permission, theme_preference, who_can_tag_me, review_tags
FROM public.profiles
WHERE location_place_id IS NOT NULL
   OR location_lat IS NOT NULL
   OR location_lng IS NOT NULL
   OR inbox_permission IS NOT NULL
   OR theme_preference IS NOT NULL
   OR who_can_tag_me IS NOT NULL
   OR review_tags IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET location_place_id = COALESCE(profile_private.location_place_id, EXCLUDED.location_place_id),
    location_lat = COALESCE(profile_private.location_lat, EXCLUDED.location_lat),
    location_lng = COALESCE(profile_private.location_lng, EXCLUDED.location_lng),
    inbox_permission = COALESCE(profile_private.inbox_permission, EXCLUDED.inbox_permission),
    theme_preference = COALESCE(profile_private.theme_preference, EXCLUDED.theme_preference),
    who_can_tag_me = COALESCE(profile_private.who_can_tag_me, EXCLUDED.who_can_tag_me),
    review_tags = COALESCE(profile_private.review_tags, EXCLUDED.review_tags);

-- Fill defaults for older private rows whose legacy profile setting was NULL.
UPDATE public.profile_private AS pp
SET inbox_permission = COALESCE(pp.inbox_permission, p.inbox_permission, 'everyone'),
    who_can_tag_me = COALESCE(pp.who_can_tag_me, p.who_can_tag_me, 'everyone'),
    review_tags = COALESCE(pp.review_tags, p.review_tags, false)
FROM public.profiles AS p
WHERE p.id = pp.id;

ALTER TABLE public.profile_private
  ALTER COLUMN inbox_permission SET DEFAULT 'everyone',
  ALTER COLUMN inbox_permission SET NOT NULL,
  ALTER COLUMN who_can_tag_me SET DEFAULT 'everyone',
  ALTER COLUMN who_can_tag_me SET NOT NULL,
  ALTER COLUMN review_tags SET DEFAULT false,
  ALTER COLUMN review_tags SET NOT NULL;

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
  church_name, allow_status_reshare
) ON TABLE public.profiles TO anon, authenticated;

-- Private table remains owner-only under its existing RLS policies.
REVOKE ALL PRIVILEGES ON TABLE public.profile_private FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profile_private TO authenticated;

NOTIFY pgrst, 'reload schema';
