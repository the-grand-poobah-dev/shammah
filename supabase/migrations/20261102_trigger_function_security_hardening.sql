-- Shammah security hardening: prevent direct RPC calls to trigger functions
-- Trigger functions are invoked by PostgreSQL triggers, not by clients via PostgREST.
-- Revoking EXECUTE from API roles does not stop triggers from running.
do $migration$
declare
  fn record;
begin
  for fn in
    select p.oid, n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %I.%I(%s) from public, anon, authenticated',
                   fn.nspname, fn.proname, fn.args);
  end loop;
end
$migration$;

-- Pin search_path on audited functions flagged by Supabase.
alter function public.category_counts() set search_path = public, pg_temp;
alter function public.church_member_counts() set search_path = public, pg_temp;
alter function public.church_active_member_counts(text[]) set search_path = public, pg_temp;
alter function public.church_follower_counts(text[]) set search_path = public, pg_temp;
alter function public.prevent_profile_role_escalation() set search_path = public, pg_temp;
alter function public.check_dob() set search_path = public, pg_temp;
alter function public.handle_user_shortcuts_updated_at() set search_path = public, pg_temp;

notify pgrst, 'reload schema';
