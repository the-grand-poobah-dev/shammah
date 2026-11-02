-- Remove direct RPC access to legacy score-writing and live-maintenance functions.
-- The app now grades Arcade submissions in /api/arcade and uses the service-role
-- overload submit_arcade_score(uuid,text,integer,integer,jsonb).
begin;

-- Legacy overloads bypass the current server-side score validation and trivia grading.
-- Guard the cleanup so this migration also works where an older overload is absent.
do $legacy_arcade_rpc$
begin
  if to_regprocedure('public.submit_arcade_score(text,integer,text)') is not null then
    execute 'revoke all on function public.submit_arcade_score(text, integer, text) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.submit_arcade_score(text,integer,jsonb,integer)') is not null then
    execute 'revoke all on function public.submit_arcade_score(text, integer, jsonb, integer) from public, anon, authenticated';
  end if;
end;
$legacy_arcade_rpc$;

-- Only the trusted server route may call the current Arcade score writer.
revoke all on function public.submit_arcade_score(uuid, text, integer, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_arcade_score(uuid, text, integer, integer, jsonb)
  to service_role;

-- Legacy rate-limit and stream-like RPCs accept caller-chosen keys/stream IDs and
-- are not used by the current API routes. Keep these mutations server-only.
revoke all on function public.check_rate_limit(text, integer, integer, numeric)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer, numeric)
  to service_role;

revoke all on function public.increment_stream_like(uuid)
  from public, anon, authenticated;
grant execute on function public.increment_stream_like(uuid) to service_role;

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
