-- Shammah migration 006: fix "permission denied for table profile_private"
--
-- Cause: 001_onboarding.sql created profile_private and its row-level-security policies,
-- but never GRANTed the signed-in role access to the table. RLS policies only filter rows
-- for a role that already has table access; without the GRANT, Postgres refuses outright.
--
-- Fix: give signed-in users the three operations the app uses (the wizard/settings do an
-- upsert = select + insert + update). The existing policies still restrict every person to
-- their OWN row, and there is deliberately no grant to anon (signed-out visitors) or DELETE.
-- Safe to re-run. Changes no data and no existing policy or trigger.

grant select, insert, update on public.profile_private to authenticated;

notify pgrst, 'reload schema';

-- Optional check — should return one row listing INSERT, SELECT, UPDATE:
-- select grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
-- from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'profile_private' and grantee = 'authenticated'
-- group by grantee;
