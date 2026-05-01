-- staff_profiles.test.sql
-- Verifies a customer cannot read any staff_profiles row.

BEGIN;
SELECT plan(1);

SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SET LOCAL role TO authenticated;

SELECT is_empty(
  $$SELECT * FROM public.staff_profiles WHERE id != auth.uid()$$,
  'customer sees zero staff_profiles rows other than self'
);

SELECT * FROM finish();
ROLLBACK;
