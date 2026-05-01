-- Migration: Hierarchical Audit Logs & Visibility
-- Implementation of visibility: 
--   Super Admin: all
--   Others: self + peers + subordinates (based on role weight)

begin;

-- 1. Ensure roles has weight column (hierarchy support)
alter table public.roles add column if not exists weight integer not null default 4;
update public.roles set weight = 1 where name = 'super_admin' and weight = 4;
-- Ensure other managers have lower weight than staff
update public.roles set weight = 2 where name like '%manager%' and name <> 'super_admin' and weight = 4;

-- 2. Helper function to get role weight of a user
create or replace function public.get_user_role_weight(p_user_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(r.weight, 1000)
  from public.staff_profiles sp
  join public.roles r on r.id = sp.role_id
  where sp.id = p_user_id;
$$;

-- 2. Update Audit Log Policies
drop policy if exists audit_logs_select_hierarchical on public.audit_logs;
drop policy if exists audit_logs_select_super_admin on public.audit_logs;
drop policy if exists audit_logs_select_self on public.audit_logs;
drop policy if exists audit_logs_self on public.audit_logs;

create policy audit_logs_select_hierarchical on public.audit_logs
  for select using (
    public.is_super_admin() or 
    (
      public.has_permission('audit', 'read') and 
      (
        -- Hierarchical: See logs where actor's weight >= your weight
        -- (Higher weight = lower privilege)
        public.get_user_role_weight(actor_id) >= public.get_user_role_weight(auth.uid())
        or actor_id = auth.uid()
      )
    )
  );

-- 3. Touch last_login_at trigger (without duplicate logging)
create or replace function public.touch_staff_last_login()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.staff_profiles
     set last_login_at = now()
   where id = new.user_id;
  return new;
end $$;

drop trigger if exists on_auth_session_created on auth.sessions;
create trigger on_auth_session_created
  after insert on auth.sessions
  for each row execute procedure public.touch_staff_last_login();

commit;
