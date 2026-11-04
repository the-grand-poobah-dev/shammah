-- Security hardening: remove privileges that application clients never need.
-- Preserve existing SELECT/INSERT/UPDATE/DELETE grants and RLS policies.
-- TRUNCATE bypasses row-level security; REFERENCES and TRIGGER are schema-level
-- capabilities and should not be available to browser roles.
begin;

do $security_acl$
declare
  r record;
begin
  for r in
    select n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format(
      'revoke truncate, references, trigger on table %I.%I from public, anon, authenticated',
      r.nspname,
      r.relname
    );
  end loop;
end;
$security_acl$;

commit;
