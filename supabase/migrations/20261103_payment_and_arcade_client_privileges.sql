-- Final targeted hardening for payment state and client-forgeable Arcade scores.
-- Safe to run repeatedly. Run manually in Supabase SQL Editor; this migration
-- is committed to the development branch only and is not applied automatically.

begin;

-- Subscription/payment records are server-managed. Browser roles currently
-- have no RLS policies on this table, so direct writes already fail under RLS;
-- remove the unused grants as defense in depth.
revoke all privileges on table public.subscriptions
  from public, anon, authenticated;

-- Enrollment and progress records are private user data. Anonymous SELECT grants
-- have no matching anonymous RLS policies, but remove those unnecessary grants.
revoke select on table public.course_enrollments, public.course_progress
  from anon;

-- Arcade scores must be submitted through the authenticated server route and
-- the service-role-only RPC, never directly by browser clients.
drop policy if exists "Users can record arcade scores" on public.arcade_scores;
drop policy if exists "User inserts own score" on public.arcade_scores;
revoke all privileges on table public.arcade_scores
  from public, anon, authenticated;

commit;
