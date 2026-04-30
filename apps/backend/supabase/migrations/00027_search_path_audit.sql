-- 00027_search_path_audit.sql
-- Purpose: Ensure every SECURITY DEFINER function in public schema has
--          SET search_path = public, pg_temp. Prevents search-path attacks.

begin;

do $$
declare
  r record;
begin
  for r in
    select n.nspname, p.proname, p.oid,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and (p.proconfig is null
           or not exists (
             select 1 from unnest(p.proconfig) c
             where c like 'search_path=%'
           ))
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, pg_temp',
      r.nspname, r.proname, r.args
    );
    raise notice 'Patched search_path on %.%(%)', r.nspname, r.proname, r.args;
  end loop;
end $$;

commit;
