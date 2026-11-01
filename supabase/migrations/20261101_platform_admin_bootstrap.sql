-- Protect privileged profile roles from self-service escalation.
-- Authenticated users may edit their own profile, but cannot assign admin roles
-- during profile creation or change their role later.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.role IN ('platform_admin', 'church_admin', 'admin', 'instructor') THEN
        NEW.role := 'member';
      END IF;
    ELSIF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Profile roles can only be changed by a trusted administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role_escalation ON public.profiles;
CREATE TRIGGER protect_profile_role_escalation
BEFORE INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- Grant platform administrator status to the explicitly verified account.
-- Idempotent: safe to run more than once. This changes only the profile role.
UPDATE public.profiles
SET role = 'platform_admin'
WHERE id = 'ab810a3d-90ed-4f21-b01d-d140bdd8449f'::uuid;
