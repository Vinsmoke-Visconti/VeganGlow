-- audit_logs_immutable.test.sql
-- Verifies that audit_logs cannot be UPDATEd or DELETEd by ANY user
-- including super_admin. Insert is always done via SECURITY DEFINER RPC.

BEGIN;
SELECT plan(2);

-- Insert a test row directly (bypassing RLS via session role escalation)
SET LOCAL role TO postgres;
INSERT INTO public.audit_logs (actor_id, action, severity, summary, resource_type)
VALUES (NULL, 'test.event', 'info', 'pgtap fixture', 'test')
RETURNING id \gset

-- Switch to authenticated context simulating a super_admin
RESET role;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000099';
SET LOCAL role TO authenticated;

SELECT throws_ok(
  format($$UPDATE public.audit_logs SET action = 'hacked' WHERE id = %L$$, :'id'),
  NULL,
  NULL,
  'authenticated user (even super_admin) cannot UPDATE audit_logs'
);

SELECT throws_ok(
  format($$DELETE FROM public.audit_logs WHERE id = %L$$, :'id'),
  NULL,
  NULL,
  'authenticated user (even super_admin) cannot DELETE audit_logs'
);

SELECT * FROM finish();
ROLLBACK;
