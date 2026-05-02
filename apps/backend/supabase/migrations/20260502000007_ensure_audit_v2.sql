-- 20260502000007_ensure_audit_v2.sql
-- Fix: Ensure log_admin_action_v2 exists and is executable by anon/authenticated
-- This unblocks audit logging for login/logout actions.

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
exception when others then
  -- In case of failure, don't block the calling business logic
  return null;
end $$;

-- Revoke and Grant
revoke all on function public.log_admin_action_v2(text, text, text, text, text, jsonb, text, text, text) from public;
grant execute on function public.log_admin_action_v2(text, text, text, text, text, jsonb, text, text, text) to authenticated, anon;

-- Also ensure the audit_logs_dlq table exists for safety
create table if not exists public.audit_logs_dlq (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  error_msg text,
  retry_count int default 0,
  created_at timestamptz default now(),
  replayed_at timestamptz
);

alter table public.audit_logs_dlq enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'dlq_insert_anyone') then
    create policy dlq_insert_anyone on public.audit_logs_dlq for insert to authenticated, anon with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'dlq_super_admin_all') then
    create policy dlq_super_admin_all on public.audit_logs_dlq for all to authenticated using (public.is_super_admin());
  end if;
end $$;
