-- 00024_mfa_backup_codes.sql
-- Purpose: Backup-code table + verify_backup_code RPC for MFA recovery flow.

begin;

create extension if not exists pgcrypto;

create table if not exists public.auth_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists backup_codes_user_idx
  on public.auth_backup_codes(user_id) where used_at is null;
alter table public.auth_backup_codes enable row level security;

drop policy if exists backup_codes_self_select on public.auth_backup_codes;
create policy backup_codes_self_select on public.auth_backup_codes
  for select using (user_id = auth.uid());

-- create_backup_codes: rotate (invalidate prior) + insert new bcrypt-hashed codes
create or replace function public.create_backup_codes(p_codes text[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare c text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.auth_backup_codes
  set used_at = now()
  where user_id = auth.uid() and used_at is null;

  foreach c in array p_codes
  loop
    insert into public.auth_backup_codes (user_id, code_hash)
    values (auth.uid(), crypt(c, gen_salt('bf', 10)));
  end loop;
end $$;

revoke all on function public.create_backup_codes(text[]) from public, anon;
grant execute on function public.create_backup_codes(text[]) to authenticated;

-- verify_backup_code: anon-callable for recovery before user is authenticated
create or replace function public.verify_backup_code(p_email text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_code_record record;
  v_match boolean := false;
begin
  select id into v_user_id from auth.users where email = lower(p_email);
  if v_user_id is null then
    perform pg_sleep(0.3);
    return jsonb_build_object('ok', false);
  end if;

  for v_code_record in
    select id, code_hash from public.auth_backup_codes
    where user_id = v_user_id and used_at is null
  loop
    if crypt(p_code, v_code_record.code_hash) = v_code_record.code_hash then
      v_match := true;
      update public.auth_backup_codes set used_at = now() where id = v_code_record.id;
      exit;
    end if;
  end loop;

  if not v_match then
    return jsonb_build_object('ok', false);
  end if;

  insert into public.audit_logs (actor_id, action, severity, summary, resource_type)
  values (v_user_id, 'auth.backup_code_used', 'warn',
          'Backup code consumed for MFA recovery', 'auth');

  return jsonb_build_object('ok', true, 'user_id', v_user_id);
end $$;

revoke all on function public.verify_backup_code(text, text) from public, authenticated;
grant execute on function public.verify_backup_code(text, text) to anon;

commit;
