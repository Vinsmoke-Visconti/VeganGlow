-- 00032_crm_loyalty_carts.sql
-- Purpose: CRM features — loyalty tiers, points ledger, live carts
--          (abandoned cart tracking for marketing).

begin;

-- 1. Loyalty tiers (Bronze, Silver, Gold, Platinum)
create table if not exists public.loyalty_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,         -- 'bronze' | 'silver' | 'gold' | 'platinum'
  display_name text not null,        -- 'Đồng' | 'Bạc' | 'Vàng' | 'Bạch kim'
  min_lifetime_spend numeric(12,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  perks jsonb,                       -- {"freeShipping": true, "earlyAccess": true}
  badge_color text,
  position int not null default 0,
  created_at timestamptz default now()
);

insert into public.loyalty_tiers (name, display_name, min_lifetime_spend, discount_percent, perks, badge_color, position) values
  ('bronze',   'Đồng',     0,         0, '{"freeShippingThreshold": 500000}'::jsonb, '#cd7f32', 1),
  ('silver',   'Bạc',      5000000,   3, '{"freeShippingThreshold": 300000}'::jsonb, '#c0c0c0', 2),
  ('gold',     'Vàng',     20000000,  5, '{"freeShippingThreshold": 0, "earlyAccess": true}'::jsonb, '#ffd700', 3),
  ('platinum', 'Bạch kim', 50000000, 10, '{"freeShippingThreshold": 0, "earlyAccess": true, "personalShopper": true}'::jsonb, '#e5e4e2', 4)
on conflict (name) do nothing;

alter table public.loyalty_tiers enable row level security;
drop policy if exists loyalty_tiers_public_read on public.loyalty_tiers;
create policy loyalty_tiers_public_read on public.loyalty_tiers for select using (true);
drop policy if exists loyalty_tiers_admin_write on public.loyalty_tiers;
create policy loyalty_tiers_admin_write on public.loyalty_tiers
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- 2. Per-customer loyalty state (denormalized for fast lookup)
alter table public.profiles
  add column if not exists lifetime_spend numeric(12,2) not null default 0,
  add column if not exists loyalty_points int not null default 0,
  add column if not exists tier_id uuid references public.loyalty_tiers(id);

-- Function to recompute tier based on lifetime_spend
create or replace function public.recompute_loyalty_tier(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_spend numeric;
  v_tier_id uuid;
begin
  select lifetime_spend into v_spend from public.profiles where id = p_user_id;
  if v_spend is null then return; end if;

  select id into v_tier_id
  from public.loyalty_tiers
  where min_lifetime_spend <= v_spend
  order by min_lifetime_spend desc
  limit 1;

  update public.profiles set tier_id = v_tier_id where id = p_user_id;
end $$;

grant execute on function public.recompute_loyalty_tier(uuid) to authenticated;

-- 3. Loyalty points ledger (immutable audit trail)
create table if not exists public.loyalty_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,                -- positive = earned, negative = spent
  reason text not null,              -- 'order_purchase' | 'voucher_redemption' | 'admin_adjustment' | 'refund'
  reference_type text,               -- 'order' | 'voucher' | etc
  reference_id text,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists loyalty_ledger_user_idx
  on public.loyalty_points_ledger(user_id, created_at desc);

alter table public.loyalty_points_ledger enable row level security;
drop policy if exists loyalty_ledger_self_read on public.loyalty_points_ledger;
create policy loyalty_ledger_self_read on public.loyalty_points_ledger
  for select using (user_id = auth.uid() or public.has_permission('customers', 'read'));

drop policy if exists loyalty_ledger_no_update on public.loyalty_points_ledger;
drop policy if exists loyalty_ledger_no_delete on public.loyalty_points_ledger;
create policy loyalty_ledger_no_update on public.loyalty_points_ledger for update using (false);
create policy loyalty_ledger_no_delete on public.loyalty_points_ledger for delete using (false);

-- Award points (admin or system)
create or replace function public.award_loyalty_points(
  p_user_id uuid,
  p_delta int,
  p_reason text,
  p_reference_type text default null,
  p_reference_id text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.is_super_admin() or public.has_permission('customers', 'update')) then
    raise exception 'permission denied';
  end if;

  insert into public.loyalty_points_ledger (user_id, delta, reason, reference_type, reference_id, granted_by)
  values (p_user_id, p_delta, p_reason, p_reference_type, p_reference_id, auth.uid());

  update public.profiles
    set loyalty_points = greatest(0, loyalty_points + p_delta)
    where id = p_user_id;
end $$;

grant execute on function public.award_loyalty_points(uuid, int, text, text, text) to authenticated;

-- 4. Live carts — track open shopping carts per user for abandoned-cart marketing
create table if not exists public.live_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text,                   -- for anon users (browser fingerprint)
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  abandoned boolean not null default false,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists live_carts_user_unique
  on public.live_carts(user_id) where user_id is not null;
create index if not exists live_carts_session_idx
  on public.live_carts(session_id) where session_id is not null;
create index if not exists live_carts_abandoned_idx
  on public.live_carts(abandoned, updated_at desc) where abandoned = true;

create or replace function public.bump_live_carts_updated_at()
returns trigger language plpgsql security invoker
set search_path = public, pg_temp
as $$ begin new.updated_at = now(); new.abandoned = false; return new; end $$;

drop trigger if exists live_carts_bump on public.live_carts;
create trigger live_carts_bump before update on public.live_carts
  for each row execute function public.bump_live_carts_updated_at();

alter table public.live_carts enable row level security;

drop policy if exists live_carts_self on public.live_carts;
create policy live_carts_self on public.live_carts
  for all using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

drop policy if exists live_carts_staff_read on public.live_carts;
create policy live_carts_staff_read on public.live_carts
  for select using (public.has_permission('customers', 'read'));

-- Mark carts abandoned after 24h idle (called by cron)
create or replace function public.mark_abandoned_carts(p_idle_hours int default 24)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count int;
begin
  update public.live_carts
  set abandoned = true
  where abandoned = false
    and updated_at < now() - (p_idle_hours::text || ' hours')::interval
    and jsonb_array_length(items) > 0;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.mark_abandoned_carts(int) from public, anon;
grant execute on function public.mark_abandoned_carts(int) to service_role;

-- 5. Backfill lifetime_spend from existing orders
update public.profiles p
set lifetime_spend = coalesce(sub.total, 0)
from (
  select user_id, sum(total_amount) as total
  from public.orders
  where status != 'cancelled'
    and (payment_status = 'paid' or (payment_method = 'cod' and status = 'completed'))
  group by user_id
) sub
where sub.user_id = p.id and (p.lifetime_spend is null or p.lifetime_spend = 0);

-- Recompute tiers for everyone
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.recompute_loyalty_tier(r.id);
  end loop;
end $$;

commit;
