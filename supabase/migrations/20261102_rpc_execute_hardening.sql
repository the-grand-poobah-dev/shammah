-- Remove direct RPC access to legacy score-writing and live-maintenance functions.
-- The app now grades Arcade submissions in /api/arcade and uses the service-role
-- overload submit_arcade_score(uuid,text,integer,integer,jsonb).
begin;

-- Legacy overloads bypass the current server-side score validation and trivia grading.
revoke all on function public.submit_arcade_score(text, integer, text)
  from public, anon, authenticated;
revoke all on function public.submit_arcade_score(text, integer, jsonb, integer)
  from public, anon, authenticated;

-- Only the trusted server route may call the current Arcade score writer.
revoke all on function public.submit_arcade_score(uuid, text, integer, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_arcade_score(uuid, text, integer, integer, jsonb)
  to service_role;

-- A public call could otherwise end every stream whose updated_at is older than six hours.
revoke all on function public.sweep_stale_live_streams()
  from public, anon, authenticated;
grant execute on function public.sweep_stale_live_streams() to service_role;

-- Trigger functions are not application RPC endpoints.
revoke all on function public.enforce_live_chat_rate_limit()
  from public, anon, authenticated;
revoke all on function public.guard_live_chat_insert()
  from public, anon, authenticated;

commit;
