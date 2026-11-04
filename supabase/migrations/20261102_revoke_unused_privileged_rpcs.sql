-- Remove client execution from privileged helpers that are not called by
-- the current app code. home_promos is SECURITY DEFINER and its reel query
-- does not enforce post visibility, so it must not be exposed until rewritten.
revoke all on function public.home_promos(uuid) from public, anon, authenticated;

-- Event-trigger functions are run by PostgreSQL's DDL event-trigger mechanism,
-- not by application clients. Explicitly remove client execution grants.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

notify pgrst, 'reload schema';
