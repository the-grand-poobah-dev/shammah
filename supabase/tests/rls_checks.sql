-- Shammah RLS / privilege catalog audit (READ ONLY).
-- This script reads PostgreSQL catalogs and effective table/function privileges only.
-- It performs no INSERT, UPDATE, DELETE, DDL, or role changes.
-- Run from Supabase SQL Editor; review the returned rows before release.
-- A catalog report is not a substitute for authenticated/anonymous end-to-end tests.

-- 1) RLS and policy coverage on core sensitive tables.
WITH expected(table_name) AS (
  VALUES
    ('profiles'),
    ('posts'),
    ('subscriptions'),
    ('mpesa_transactions'),
    ('fundraisers'),
    ('fundraiser_donations'),
    ('course_enrollments'),
    ('poll_votes'),
    ('arcade_scores'),
    ('arcade_achievements'),
    ('promo_events'),
    ('direct_messages'),
    ('live_streams'),
    ('challenges')
)
SELECT
  e.table_name,
  c.oid IS NOT NULL AS table_exists,
  COALESCE(c.relrowsecurity, false) AS rls_enabled,
  COALESCE(c.relforcerowsecurity, false) AS force_rls,
  COUNT(p.policyname)::integer AS policy_count,
  CASE
    WHEN c.oid IS NULL THEN 'REVIEW: table not present in this schema'
    WHEN NOT c.relrowsecurity THEN 'REVIEW: RLS is disabled'
    WHEN COUNT(p.policyname) = 0 THEN 'REVIEW: no RLS policies found'
    ELSE 'REVIEW: inspect policy intent and grants'
  END AS review_status
FROM expected e
LEFT JOIN pg_namespace n ON n.nspname = 'public'
LEFT JOIN pg_class c ON c.relnamespace = n.oid
  AND c.relname = e.table_name
  AND c.relkind IN ('r', 'p')
LEFT JOIN pg_policies p ON p.schemaname = 'public'
  AND p.tablename = e.table_name
GROUP BY e.table_name, c.oid, c.relrowsecurity, c.relforcerowsecurity
ORDER BY e.table_name;

-- 2) Effective client SELECT/INSERT/UPDATE/DELETE privileges on sensitive tables.
-- These are observations, not automatic failures: expected access differs by feature.
SELECT
  t.table_name,
  has_table_privilege('anon', format('public.%I', t.table_name), 'SELECT') AS anon_select,
  has_table_privilege('authenticated', format('public.%I', t.table_name), 'SELECT') AS authenticated_select,
  has_table_privilege('anon', format('public.%I', t.table_name), 'INSERT') AS anon_insert,
  has_table_privilege('authenticated', format('public.%I', t.table_name), 'INSERT') AS authenticated_insert,
  has_table_privilege('anon', format('public.%I', t.table_name), 'UPDATE') AS anon_update,
  has_table_privilege('authenticated', format('public.%I', t.table_name), 'UPDATE') AS authenticated_update,
  has_table_privilege('anon', format('public.%I', t.table_name), 'DELETE') AS anon_delete,
  has_table_privilege('authenticated', format('public.%I', t.table_name), 'DELETE') AS authenticated_delete
FROM (VALUES
  ('profiles'),
  ('subscriptions'),
  ('mpesa_transactions'),
  ('fundraiser_donations'),
  ('arcade_scores'),
  ('arcade_achievements'),
  ('promo_events')
) AS t(table_name)
WHERE to_regclass(format('public.%I', t.table_name)) IS NOT NULL
ORDER BY t.table_name;

-- 3) Confirm that the M-Pesa callback inbox processor is not executable by client roles.
-- Expected from prior verification: service_role may execute; anon/authenticated may not.
SELECT
  to_regprocedure('public.process_fundraiser_callback_inbox(text)') IS NOT NULL AS function_exists,
  CASE WHEN to_regprocedure('public.process_fundraiser_callback_inbox(text)') IS NOT NULL
    THEN has_function_privilege('anon', to_regprocedure('public.process_fundraiser_callback_inbox(text)'), 'EXECUTE')
    ELSE NULL END AS anon_can_execute,
  CASE WHEN to_regprocedure('public.process_fundraiser_callback_inbox(text)') IS NOT NULL
    THEN has_function_privilege('authenticated', to_regprocedure('public.process_fundraiser_callback_inbox(text)'), 'EXECUTE')
    ELSE NULL END AS authenticated_can_execute,
  CASE WHEN to_regprocedure('public.process_fundraiser_callback_inbox(text)') IS NOT NULL
    THEN has_function_privilege('service_role', to_regprocedure('public.process_fundraiser_callback_inbox(text)'), 'EXECUTE')
    ELSE NULL END AS service_role_can_execute;

-- 4) Analytics visibility check: anonymous SELECT must remain false for promo_events.
SELECT
  to_regclass('public.promo_events') IS NOT NULL AS promo_events_exists,
  CASE WHEN to_regclass('public.promo_events') IS NOT NULL
    THEN has_table_privilege('anon', 'public.promo_events', 'SELECT')
    ELSE NULL END AS anon_can_select_promo_events,
  CASE WHEN to_regclass('public.promo_events') IS NOT NULL
    THEN has_table_privilege('authenticated', 'public.promo_events', 'SELECT')
    ELSE NULL END AS authenticated_has_select_grant,
  'RLS policy should restrict authenticated SELECT to admin roles'::text AS expected_policy_behavior;
