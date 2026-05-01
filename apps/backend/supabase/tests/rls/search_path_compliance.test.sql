-- search_path_compliance.test.sql
-- CI guard: every SECURITY DEFINER function in public schema must have
-- SET search_path = public, pg_temp. Prevents search-path attacks.

\set ON_ERROR_STOP true

DO $$
DECLARE
  v_count int;
  v_offenders text;
BEGIN
  SELECT count(*),
         string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ')
    INTO v_count, v_offenders
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (p.proconfig IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM unnest(p.proconfig) c
           WHERE c LIKE 'search_path=%'
         ));

  IF v_count > 0 THEN
    RAISE EXCEPTION 'FAIL: % SECURITY DEFINER function(s) without search_path: %',
      v_count, v_offenders;
  END IF;
END $$;

\echo 'PASS: all SECURITY DEFINER functions have search_path set';
