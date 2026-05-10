-- Fix audit log visibility: ensure audit_logs_self policy from 00007
-- doesn't conflict with the newer policies from 00023.
-- Also drop the old restrictive INSERT policy that prevents security-definer writes.

begin;

-- Drop the old conflicting policies from 00007
drop policy if exists audit_logs_self on public.audit_logs;
drop policy if exists audit_logs_insert on public.audit_logs;

-- Re-create clean SELECT policies (from 00023, but ensure they exist)
drop policy if exists audit_logs_select_super_admin on public.audit_logs;
drop policy if exists audit_logs_select_self on public.audit_logs;

create policy audit_logs_select_super_admin on public.audit_logs
  for select using (public.is_super_admin() or public.has_permission('audit', 'read'));

create policy audit_logs_select_self on public.audit_logs
  for select using (actor_id = auth.uid());

-- Allow the security-definer RPC to insert freely (it runs as DB owner anyway,
-- but this covers any edge case where RLS is checked)
drop policy if exists audit_logs_insert_via_rpc on public.audit_logs;
create policy audit_logs_insert_via_rpc on public.audit_logs
  for insert with check (true);

-- Keep immutability (no update/delete)
drop policy if exists audit_logs_no_update on public.audit_logs;
drop policy if exists audit_logs_no_delete on public.audit_logs;
create policy audit_logs_no_update on public.audit_logs for update using (false);
create policy audit_logs_no_delete on public.audit_logs for delete using (false);

commit;
