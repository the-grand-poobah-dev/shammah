-- Grant platform administrator status to the explicitly verified account.
-- Idempotent: safe to run more than once. This changes only the profile role.
UPDATE public.profiles
SET role = 'platform_admin'
WHERE id = 'ab810a3d-90ed-4f21-b01d-d140bdd8449f'::uuid;
