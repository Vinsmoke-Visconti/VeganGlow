-- VeganGlow Admin Enterprise Foundation
-- Adds the missing operational tables used by the enterprise admin dashboard.

-- Product variants are required before stock_movements can reference them.
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text unique,
  size text,
  color text,
  price_delta numeric(12, 2) not null default 0,
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color)
);

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  old_price numeric(12, 2),
  new_price numeric(12, 2),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);



create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.product_variants(id) on delete set null,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  movement_type text not null check (movement_type in ('in', 'out', 'adjust', 'return')),
  quantity integer not null,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.product_variants enable row level security;
alter table public.warehouses enable row level security;
alter table public.price_history enable row level security;
alter table public.stock_movements enable row level security;
alter table public.customer_segments enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists product_variants_read_public on public.product_variants;
create policy product_variants_read_public on public.product_variants
  for select to anon, authenticated
  using (
    is_active
    and exists (
      select 1
      from public.products p
      where p.id = product_id and p.is_active = true
    )
  );

drop policy if exists product_variants_write_staff on public.product_variants;
create policy product_variants_write_staff on public.product_variants
  for all to authenticated
  using (public.has_permission('products', 'write') or public.is_super_admin())
  with check (public.has_permission('products', 'write') or public.is_super_admin());

drop policy if exists warehouses_staff_all on public.warehouses;
create policy warehouses_staff_all on public.warehouses
  for all to authenticated
  using (public.is_staff() or public.is_super_admin())
  with check (public.is_staff() or public.is_super_admin());

drop policy if exists price_history_staff_all on public.price_history;
create policy price_history_staff_all on public.price_history
  for all to authenticated
  using (public.has_permission('products', 'read') or public.is_super_admin())
  with check (public.has_permission('products', 'write') or public.is_super_admin());



drop policy if exists stock_movements_staff_all on public.stock_movements;
create policy stock_movements_staff_all on public.stock_movements
  for all to authenticated
  using (public.is_staff() or public.is_super_admin())
  with check (public.is_staff() or public.is_super_admin());

drop policy if exists customer_segments_staff_all on public.customer_segments;
create policy customer_segments_staff_all on public.customer_segments
  for all to authenticated
  using (public.has_permission('customers', 'read') or public.is_super_admin())
  with check (public.has_permission('customers', 'write') or public.is_super_admin());

drop policy if exists analytics_events_insert_public on public.analytics_events;
create policy analytics_events_insert_public on public.analytics_events
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists analytics_events_read_staff on public.analytics_events;
create policy analytics_events_read_staff on public.analytics_events
  for select to authenticated
  using (public.is_staff() or public.is_super_admin());

grant select, insert, update, delete on public.product_variants to authenticated;
grant select, insert, update, delete on public.warehouses to authenticated;
grant select, insert, update, delete on public.price_history to authenticated;
grant select, insert, update, delete on public.stock_movements to authenticated;
grant select, insert, update, delete on public.customer_segments to authenticated;
grant select on public.analytics_events to authenticated;
grant insert on public.analytics_events to anon, authenticated;

create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_analytics_event_type on public.analytics_events(event_type, created_at desc);
create index if not exists idx_analytics_session on public.analytics_events(session_id, created_at desc);
create index if not exists idx_stock_variant on public.stock_movements(variant_id, created_at desc);
create index if not exists idx_stock_warehouse on public.stock_movements(warehouse_id, created_at desc);
create index if not exists idx_price_history_product on public.price_history(product_id, changed_at desc);
create index if not exists idx_product_variants_product on public.product_variants(product_id);

insert into public.permissions (module, action, display_name, description) values
  ('customers', 'read', 'Xem khách hàng', 'Xem hồ sơ và phân khúc khách hàng'),
  ('customers', 'write', 'Quản lý khách hàng', 'Quản lý phân khúc và thẻ khách hàng'),
  ('inventory', 'read', 'Xem kho', 'Xem tồn kho và lịch sử nhập xuất'),
  ('inventory', 'write', 'Quản lý kho', 'Tạo điều chỉnh kho và nhập xuất hàng'),
  ('analytics', 'read', 'Xem phân tích', 'Xem báo cáo và phân tích vận hành')
on conflict (module, action) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'super_admin'
  and p.module in ('customers', 'inventory', 'analytics')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'customer_support'
  and p.module = 'customers'
  and p.action = 'read'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'inventory_manager'
  and p.module = 'inventory'
on conflict do nothing;

-- Keep the KPI RPC compact, but include AOV and conversion from real orders/events.
create or replace function public.admin_dashboard_kpis(
  p_since timestamptz,
  p_until timestamptz default now()
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_period_len interval;
  v_prev_since timestamptz;
  v_prev_until timestamptz;
  v_revenue numeric;
  v_orders bigint;
  v_revenue_orders bigint;
  v_customers bigint;
  v_low_stock bigint;
  v_prev_revenue numeric;
  v_prev_orders bigint;
  v_prev_customers bigint;
  v_sessions bigint;
  v_conversion_rate numeric;
  v_average_order_value numeric;
begin
  if not (public.is_staff() or public.is_super_admin()) then
    raise exception 'admin_dashboard_kpis: access denied';
  end if;

  v_period_len := p_until - p_since;
  v_prev_since := p_since - v_period_len;
  v_prev_until := p_since;

  select
    coalesce(sum(case when status <> 'cancelled' then total_amount else 0 end), 0),
    count(*),
    count(*) filter (where status <> 'cancelled')
  into v_revenue, v_orders, v_revenue_orders
  from public.orders
  where created_at >= p_since and created_at < p_until;

  v_average_order_value :=
    case when v_revenue_orders > 0 then round(v_revenue / v_revenue_orders, 2) else 0 end;

  select count(*) into v_customers
  from public.profiles
  where role = 'customer' and created_at >= p_since and created_at < p_until;

  select count(*) into v_low_stock
  from public.products
  where is_active = true and stock < 5;

  select count(distinct session_id) into v_sessions
  from public.analytics_events
  where created_at >= p_since
    and created_at < p_until
    and session_id is not null
    and event_type in ('page_view', 'product_view', 'checkout_started');

  v_conversion_rate :=
    case when coalesce(v_sessions, 0) > 0
      then round((v_revenue_orders::numeric / v_sessions::numeric) * 100, 2)
      else 0
    end;

  select
    coalesce(sum(case when status <> 'cancelled' then total_amount else 0 end), 0),
    count(*)
  into v_prev_revenue, v_prev_orders
  from public.orders
  where created_at >= v_prev_since and created_at < v_prev_until;

  select count(*) into v_prev_customers
  from public.profiles
  where role = 'customer'
    and created_at >= v_prev_since and created_at < v_prev_until;

  return jsonb_build_object(
    'revenue', v_revenue,
    'orders', v_orders,
    'customers', v_customers,
    'low_stock', v_low_stock,
    'prev_revenue', v_prev_revenue,
    'prev_orders', v_prev_orders,
    'prev_customers', v_prev_customers,
    'average_order_value', v_average_order_value,
    'conversion_rate', v_conversion_rate
  );
end $$;

revoke all on function public.admin_dashboard_kpis(timestamptz, timestamptz) from public;
grant execute on function public.admin_dashboard_kpis(timestamptz, timestamptz) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
    ) then
      execute 'alter publication supabase_realtime add table public.orders';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stock_movements'
    ) then
      execute 'alter publication supabase_realtime add table public.stock_movements';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'analytics_events'
    ) then
      execute 'alter publication supabase_realtime add table public.analytics_events';
    end if;
  end if;
end $$;

alter table public.orders replica identity full;
alter table public.stock_movements replica identity full;
alter table public.analytics_events replica identity full;
