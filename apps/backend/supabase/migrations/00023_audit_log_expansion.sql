-- 00023_audit_log_expansion.sql
-- Purpose: Audit log v2 — severity, ip_hash (PII-safe), GIN index, DLQ table,
--          GDPR anonymize function, immutable policies.

begin;

alter table public.audit_logs
  add column if not exists severity text not null default 'info'
    check (severity in ('info', 'warn', 'error', 'critical')),
  add column if not exists user_agent text,
  add column if not exists request_id text,
  add column if not exists session_id text;

-- Add ip_hash alongside ip_address (keep ip_address for backward compat with existing queries).
-- New code uses ip_hash; legacy queries continue reading ip_address.
alter table public.audit_logs
  add column if not exists ip_hash text;

create index if not exists audit_logs_action_idx
  on public.audit_logs(action, created_at desc);
create index if not exists audit_logs_severity_idx
  on public.audit_logs(severity, created_at desc)
  where severity in ('warn', 'error', 'critical');
create index if not exists audit_logs_details_gin_idx
  on public.audit_logs using gin (details jsonb_path_ops);

-- Immutable: nobody can UPDATE/DELETE
drop policy if exists audit_logs_no_update on public.audit_logs;
drop policy if exists audit_logs_no_delete on public.audit_logs;
create policy audit_logs_no_update on public.audit_logs for update using (false);
create policy audit_logs_no_delete on public.audit_logs for delete using (false);

-- Read: super_admin sees all; others see their own
drop policy if exists audit_logs_select_super_admin on public.audit_logs;
drop policy if exists audit_logs_select_self on public.audit_logs;
create policy audit_logs_select_super_admin on public.audit_logs
  for select using (public.is_super_admin() or public.has_permission('audit', 'read'));
create policy audit_logs_select_self on public.audit_logs
  for select using (actor_id = auth.uid());

-- DLQ
create table if not exists public.audit_logs_dlq (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  error_msg text,
  retry_count int default 0,
  created_at timestamptz default now(),
  replayed_at timestamptz
);
alter table public.audit_logs_dlq enable row level security;
drop policy if exists dlq_super_admin_all on public.audit_logs_dlq;
create policy dlq_super_admin_all on public.audit_logs_dlq
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- log_admin_action_v2: typed RPC
drop function if exists public.log_admin_action_v2(text, text, text, text, text, jsonb, text, text, text);
create or replace function public.log_admin_action_v2(
  p_action text,
  p_severity text default 'info',
  p_entity text default null,
  p_entity_id text default null,
  p_summary text default null,
  p_details jsonb default null,
  p_ip_hash text default null,
  p_user_agent text default null,
  p_request_id text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  insert into public.audit_logs
    (actor_id, action, severity, entity, entity_id, summary, details,
     ip_hash, user_agent, request_id, resource_type)
  values
    (auth.uid(), p_action, p_severity, p_entity, p_entity_id, p_summary, p_details,
     p_ip_hash, p_user_agent, p_request_id, coalesce(p_entity, 'unknown'))
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.log_admin_action_v2(text, text, text, text, text, jsonb, text, text, text) from public;
grant execute on function public.log_admin_action_v2(text, text, text, text, text, jsonb, text, text, text) to authenticated, anon;

-- GDPR anonymize: preserve WHAT happened (action, time) but remove WHO (PII)
create or replace function public.anonymize_user_audit_logs(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_super_admin() then
    raise exception 'permission denied';
  end if;

  update public.audit_logs
  set ip_hash = null,
      ip_address = null,
      user_agent = null,
      session_id = null,
      details = coalesce(details, '{}'::jsonb) - 'email' - 'phone' - 'address' - 'full_name'
  where actor_id = target_user_id;

  insert into public.audit_logs (actor_id, action, severity, entity, entity_id, summary, resource_type)
  values (auth.uid(), 'gdpr.user_anonymized', 'critical', 'user', target_user_id::text,
          'Anonymized audit logs for user ' || target_user_id, 'user');
end $$;

revoke all on function public.anonymize_user_audit_logs(uuid) from public, anon, authenticated;

commit;
