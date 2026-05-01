-- 00031_order_workflow_returns.sql
-- Purpose: Order timeline (status_history) + Returns/Refunds module.

begin;

-- 1. Order status timeline (immutable per-event)
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx
  on public.order_status_history(order_id, created_at desc);
alter table public.order_status_history enable row level security;

drop policy if exists order_status_history_owner_read on public.order_status_history;
create policy order_status_history_owner_read on public.order_status_history
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or public.has_permission('orders', 'read')
  );

-- INSERT only via SECURITY DEFINER RPC; UPDATE/DELETE denied to preserve history
drop policy if exists order_status_history_no_update on public.order_status_history;
drop policy if exists order_status_history_no_delete on public.order_status_history;
create policy order_status_history_no_update on public.order_status_history for update using (false);
create policy order_status_history_no_delete on public.order_status_history for delete using (false);

-- Trigger: log every orders.status change automatically
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  elsif (tg_op = 'INSERT') then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists trg_log_order_status on public.orders;
create trigger trg_log_order_status
  after insert or update of status on public.orders
  for each row execute function public.log_order_status_change();

-- 2. Returns / Refunds (RMA — Return Merchandise Authorization)
create table if not exists public.order_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  rma_code text not null unique,
  reason text not null,
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'received', 'refunded', 'rejected', 'cancelled')),
  refund_amount numeric(12,2) check (refund_amount is null or refund_amount >= 0),
  refund_method text, -- 'bank_transfer' | 'wallet_credit' | 'replace'
  customer_note text,
  staff_note text,
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  refunded_by uuid references auth.users(id) on delete set null,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists order_returns_order_idx on public.order_returns(order_id);
create index if not exists order_returns_status_idx on public.order_returns(status, created_at desc);

create or replace function public.bump_order_returns_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists order_returns_updated_at on public.order_returns;
create trigger order_returns_updated_at
  before update on public.order_returns
  for each row execute function public.bump_order_returns_updated_at();

alter table public.order_returns enable row level security;

drop policy if exists order_returns_owner_read on public.order_returns;
create policy order_returns_owner_read on public.order_returns
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or public.has_permission('orders', 'read')
  );

drop policy if exists order_returns_owner_insert on public.order_returns;
create policy order_returns_owner_insert on public.order_returns
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists order_returns_staff_write on public.order_returns;
create policy order_returns_staff_write on public.order_returns
  for all using (
    public.is_super_admin() or public.has_permission('orders', 'refund')
  )
  with check (
    public.is_super_admin() or public.has_permission('orders', 'refund')
  );

-- 3. Order return items (which line items are being returned)
create table if not exists public.order_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.order_returns(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  quantity int not null check (quantity > 0),
  reason text
);
create index if not exists order_return_items_return_idx on public.order_return_items(return_id);
alter table public.order_return_items enable row level security;

drop policy if exists order_return_items_read on public.order_return_items;
create policy order_return_items_read on public.order_return_items
  for select using (
    exists (
      select 1 from public.order_returns r
      join public.orders o on o.id = r.order_id
      where r.id = return_id
      and (o.user_id = auth.uid() or public.has_permission('orders', 'read'))
    )
  );

drop policy if exists order_return_items_write on public.order_return_items;
create policy order_return_items_write on public.order_return_items
  for all using (
    public.is_super_admin() or public.has_permission('orders', 'refund')
    or exists (
      select 1 from public.order_returns r
      join public.orders o on o.id = r.order_id
      where r.id = return_id and o.user_id = auth.uid() and r.status = 'requested'
    )
  )
  with check (
    public.is_super_admin() or public.has_permission('orders', 'refund')
    or exists (
      select 1 from public.order_returns r
      join public.orders o on o.id = r.order_id
      where r.id = return_id and o.user_id = auth.uid() and r.status = 'requested'
    )
  );

-- 4. Helper RPC: generate next RMA code (RMA-YYYY-NNNN)
create or replace function public.generate_rma_code()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_year int := extract(year from now())::int;
  v_seq int;
begin
  select coalesce(max(substring(rma_code from 'RMA-\d+-(\d+)')::int), 0) + 1
    into v_seq
    from public.order_returns
    where rma_code like 'RMA-' || v_year || '-%';
  return 'RMA-' || v_year || '-' || lpad(v_seq::text, 4, '0');
end $$;

grant execute on function public.generate_rma_code() to authenticated;

commit;
