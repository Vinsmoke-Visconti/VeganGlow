-- payment_transactions.test.sql
-- Verifies the critical security property: a customer cannot UPDATE
-- payment_transactions to mark themselves paid.

BEGIN;
SELECT plan(1);

SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SET LOCAL role TO authenticated;

SELECT throws_ok(
  $$UPDATE public.payment_transactions SET status = 'paid' WHERE 1=1$$,
  NULL,
  NULL,
  'customer cannot UPDATE payment_transactions to self-mark paid'
);

SELECT * FROM finish();
ROLLBACK;
