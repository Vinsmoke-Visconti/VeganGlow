-- Ensure missing columns exist in case previous migrations failed to add them 
-- due to some conflict, and reload the PostgREST schema cache.

begin;

alter table public.audit_logs
  add column if not exists ip_hash text,
  add column if not exists severity text not null default 'info',
  add column if not exists user_agent text,
  add column if not exists request_id text,
  add column if not exists session_id text;

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

commit;
