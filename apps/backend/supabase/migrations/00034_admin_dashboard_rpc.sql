-- VeganGlow Admin Dashboard — Optimized aggregate RPCs
-- Replaces full-table reads in apps/web/src/lib/admin/queries/dashboard.ts
-- with database-side SUM/COUNT, returning compact JSONB.

-- ============================================================================
-- 1. KPI snapshot (current period + previous period for delta calculation)
-- ============================================================================
-- Returns:
--   { revenue, orders, customers, low_stock,
--     prev_revenue, prev_orders, prev_customers }
-- One round-trip; SUM/COUNT done in Postgres.
create or replace function public.admin_dashboard_kpis(
  p_since timestamptz,
  p_until timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_period_len interval;
  v_prev_since timestamptz;
  v_prev_until timestamptz;
  v_revenue numeric;
  v_orders bigint;
  v_customers bigint;
  v_low_stock bigint;
  v_prev_revenue numeric;
  v_prev_orders bigint;
  v_prev_customers bigint;
begin
  if not (public.is_staff() or public.is_super_admin()) then
    raise exception 'admin_dashboard_kpis: access denied';
  end if;

  v_period_len := p_until - p_since;
  v_prev_since := p_since - v_period_len;
  v_prev_until := p_since;

  -- Current period
  select
    coalesce(sum(case when status <> 'cancelled' then total_amount else 0 end), 0),
    count(*)
  into v_revenue, v_orders
  from public.orders
  where created_at >= p_since and created_at < p_until;

  select count(*) into v_customers
  from public.profiles
  where role = 'customer' and created_at >= p_since and created_at < p_until;

  select count(*) into v_low_stock
  from public.products
  where is_active = true and stock < 5;

  -- Previous period (for delta %)
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
    'prev_customers', v_prev_customers
  );
end $$;

revoke all on function public.admin_dashboard_kpis(timestamptz, timestamptz) from public;
grant execute on function public.admin_dashboard_kpis(timestamptz, timestamptz) to authenticated;

-- ============================================================================
-- 2. Revenue series — bucketed by day, DB-side aggregate
-- ============================================================================
create or replace function public.admin_dashboard_revenue_series(
  p_days integer default 7
)
returns table (bucket_date date, revenue numeric, orders bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz;
begin
  if not (public.is_staff() or public.is_super_admin()) then
    raise exception 'admin_dashboard_revenue_series: access denied';
  end if;

  v_since := date_trunc('day', now()) - make_interval(days => greatest(p_days, 1) - 1);

  return query
  with day_grid as (
    select generate_series(
      v_since::date,
      (now())::date,
      '1 day'::interval
    )::date as d
  ),
  agg as (
    select
      created_at::date as d,
      sum(total_amount) as revenue,
      count(*) as orders
    from public.orders
    where created_at >= v_since and status <> 'cancelled'
    group by 1
  )
  select
    g.d,
    coalesce(a.revenue, 0)::numeric,
    coalesce(a.orders, 0)::bigint
  from day_grid g
  left join agg a on a.d = g.d
  order by g.d asc;
end $$;

revoke all on function public.admin_dashboard_revenue_series(integer) from public;
grant execute on function public.admin_dashboard_revenue_series(integer) to authenticated;

-- ============================================================================
-- 3. Top products — DB-side SUM(quantity), SUM(unit_price * quantity)
-- ============================================================================
create or replace function public.admin_dashboard_top_products(
  p_days integer default 7,
  p_limit integer default 5
)
returns table (
  product_id uuid,
  product_name text,
  quantity bigint,
  revenue numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz;
begin
  if not (public.is_staff() or public.is_super_admin()) then
    raise exception 'admin_dashboard_top_products: access denied';
  end if;

  v_since := now() - make_interval(days => greatest(p_days, 1));

  return query
  select
    oi.product_id,
    coalesce(max(oi.product_name), '(unknown)') as product_name,
    sum(oi.quantity)::bigint as quantity,
    sum(oi.unit_price * oi.quantity)::numeric as revenue
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.created_at >= v_since and o.status <> 'cancelled'
  group by oi.product_id
  order by quantity desc nulls last
  limit greatest(p_limit, 1);
end $$;

revoke all on function public.admin_dashboard_top_products(integer, integer) from public;
grant execute on function public.admin_dashboard_top_products(integer, integer) to authenticated;

-- ============================================================================
-- 4. Status breakdown — pending / processing / shipping / completed / cancelled
-- ============================================================================
create or replace function public.admin_dashboard_status_breakdown(
  p_since timestamptz default (now() - interval '30 days')
)
returns table (status text, total bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_staff() or public.is_super_admin()) then
    raise exception 'admin_dashboard_status_breakdown: access denied';
  end if;

  return query
  select o.status, count(*)::bigint
  from public.orders o
  where o.created_at >= p_since
  group by o.status
  order by count(*) desc;
end $$;

revoke all on function public.admin_dashboard_status_breakdown(timestamptz) from public;
grant execute on function public.admin_dashboard_status_breakdown(timestamptz) to authenticated;

-- ============================================================================
-- 5. Helpful indexes (idempotent) for fast aggregates
-- ============================================================================
create index if not exists orders_created_status_idx
  on public.orders (created_at desc, status);

create index if not exists order_items_product_idx
  on public.order_items (product_id);

create index if not exists profiles_role_created_idx
  on public.profiles (role, created_at desc);

create index if not exists products_active_stock_idx
  on public.products (is_active, stock)
  where is_active = true;
