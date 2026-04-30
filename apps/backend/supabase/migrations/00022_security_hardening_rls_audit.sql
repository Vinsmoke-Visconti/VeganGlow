-- 00022_security_hardening_rls_audit.sql
-- Purpose: Close top-10 RLS gaps identified in security-hardening design §4.
--          Idempotent: safe to re-run.
-- Reversal: DROP POLICY for each policy created here.

begin;

-- 1. payment_transactions: prevent users from updating status (e.g. self-marking paid)
drop policy if exists payment_tx_user_update on public.payment_transactions;
drop policy if exists payment_tx_no_user_update on public.payment_transactions;
create policy payment_tx_no_user_update on public.payment_transactions
  for update using (false);

drop policy if exists payment_tx_select on public.payment_transactions;
create policy payment_tx_select on public.payment_transactions
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or public.has_permission('orders', 'read')
  );

-- 2. checkout_idempotency_keys: deny direct table access; only RPCs may use it
drop policy if exists idempotency_no_direct on public.checkout_idempotency_keys;
create policy idempotency_no_direct on public.checkout_idempotency_keys
  for all using (false);

-- 3. user_banks: self-only CRUD
alter table public.user_banks enable row level security;
drop policy if exists user_banks_self_all on public.user_banks;
create policy user_banks_self_all on public.user_banks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4. system_settings: read by staff, write by super_admin
drop policy if exists system_settings_read on public.system_settings;
drop policy if exists system_settings_write on public.system_settings;
create policy system_settings_read on public.system_settings
  for select using (public.is_staff());
create policy system_settings_write on public.system_settings
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- 5. roles, permissions, role_permissions: read by staff, write by super_admin
do $$
declare t text;
begin
  foreach t in array array['roles', 'permissions', 'role_permissions']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (public.is_staff())', t, t);
    execute format('create policy %I_write on public.%I for all using (public.is_super_admin()) with check (public.is_super_admin())', t, t);
  end loop;
end $$;

-- 6. staff_profiles: super_admin or self read; super_admin write
drop policy if exists staff_profiles_select on public.staff_profiles;
drop policy if exists staff_profiles_write on public.staff_profiles;
create policy staff_profiles_select on public.staff_profiles
  for select using (id = auth.uid() or public.is_super_admin());
create policy staff_profiles_write on public.staff_profiles
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- 7. staff_invitations: super_admin only
drop policy if exists staff_invitations_all on public.staff_invitations;
create policy staff_invitations_all on public.staff_invitations
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- 8. user_permissions (added in 00021_rbac_hierarchy_upgrade): super_admin or users:assign_roles
drop policy if exists user_permissions_read on public.user_permissions;
drop policy if exists user_permissions_write on public.user_permissions;
create policy user_permissions_read on public.user_permissions
  for select using (public.is_staff());
create policy user_permissions_write on public.user_permissions
  for all using (public.is_super_admin() or public.has_permission('users', 'assign_roles'))
  with check (public.is_super_admin() or public.has_permission('users', 'assign_roles'));

commit;
