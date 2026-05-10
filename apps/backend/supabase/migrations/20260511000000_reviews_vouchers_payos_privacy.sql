-- ============================================================================
-- Migration: Reviews + Vouchers + PayOS + Privacy Updates
-- ============================================================================

begin;

-- ============================================================================
-- 1. ENFORCE PURCHASE-BEFORE-REVIEW
-- ============================================================================

create or replace function public.enforce_purchase_before_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = new.product_id
      and o.user_id = new.user_id
      and o.status = 'completed'
  ) then
    raise exception 'PURCHASE_REQUIRED: Bạn cần mua và nhận hàng thành công trước khi đánh giá sản phẩm này.'
      using errcode = '22023';
  end if;

  new.is_verified_purchase := true;
  return new;
end;
$$;

drop trigger if exists trg_compute_review_verified on public.reviews;
drop trigger if exists trg_enforce_purchase_before_review on public.reviews;
create trigger trg_enforce_purchase_before_review
  before insert on public.reviews
  for each row execute function public.enforce_purchase_before_review();

-- ============================================================================
-- 2. RESET FAKE REVIEW DATA
-- ============================================================================
update public.products
set rating = 0,
    reviews_count = 0;

delete from public.reviews
where is_verified_purchase = false or is_verified_purchase is null;

-- ============================================================================
-- 3. ENSURE starts_at COLUMN EXISTS ON VOUCHERS
-- ============================================================================
alter table public.vouchers
  add column if not exists starts_at timestamptz;

-- Dynamically drop any check constraint on discount_type column
do $$
declare
  cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'vouchers'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%discount_type%'
  loop
    execute format('alter table public.vouchers drop constraint if exists %I', cname);
  end loop;
end $$;

-- Fix any existing rows with unknown discount_type
update public.vouchers
set discount_type = 'percent'
where discount_type not in ('percent', 'fixed', 'shipping');

-- Re-add the constraint allowing all three types
alter table public.vouchers
  add constraint vouchers_discount_type_check
  check (discount_type in ('percent', 'fixed', 'shipping'));

-- ============================================================================
-- 4. SEED 20 REALISTIC VOUCHERS
-- ============================================================================
delete from public.vouchers
where code in (
  'NEWGLOW10', 'FREESHIP', 'VIP50K', 'TET2026',
  'NEWBIE100', 'GLOW20', 'SAVER20',
  'FREESHIP50', 'SHIPFREE100', 'SHIPMEMBER', 'FREESHIP0',
  'WELCOME10', 'GLOW15', 'SUMMER20', 'FLASH25',
  'SILVER5', 'GOLD10', 'PLAT15', 'DIAMOND20',
  'SAVE30K', 'SAVE50K', 'SAVE100K', 'SAVE200K',
  'NEWBIE50K', 'BIRTHDAY100', 'LOYALTY150', 'WEEKEND80'
);

insert into public.vouchers (code, title, discount_type, discount_value, min_order, quota, used_count, starts_at, expires_at, status)
values
  -- === FREE SHIPPING vouchers ===
  ('FREESHIP50', 'Miễn phí vận chuyển đơn từ 200K', 'shipping', 50000, 200000, 500, 0, now(), now() + interval '60 days', 'active'),
  ('SHIPFREE100', 'Free ship toàn quốc đơn từ 500K', 'shipping', 100000, 500000, 300, 0, now(), now() + interval '30 days', 'active'),
  ('SHIPMEMBER', 'Free ship dành cho Member', 'shipping', 30000, 100000, 1000, 0, now(), now() + interval '90 days', 'active'),
  ('FREESHIP0', 'Miễn phí ship - Không điều kiện', 'shipping', 40000, 0, 200, 0, now(), now() + interval '14 days', 'active'),

  -- === PERCENTAGE discount vouchers ===
  ('WELCOME10', 'Chào mừng thành viên mới - Giảm 10%', 'percent', 10, 150000, 2000, 0, now(), now() + interval '90 days', 'active'),
  ('GLOW15', 'VeganGlow ưu đãi 15%', 'percent', 15, 300000, 500, 0, now(), now() + interval '30 days', 'active'),
  ('SUMMER20', 'Khuyến mãi Hè 2026 - Giảm 20%', 'percent', 20, 400000, 300, 0, now(), now() + interval '45 days', 'active'),
  ('FLASH25', 'Flash Sale - Giảm sốc 25%', 'percent', 25, 500000, 100, 0, now(), now() + interval '7 days', 'active'),
  ('SILVER5', 'Ưu đãi hạng Bạc - Giảm 5%', 'percent', 5, 200000, 500, 0, now(), now() + interval '60 days', 'active'),
  ('GOLD10', 'Ưu đãi hạng Vàng - Giảm 10%', 'percent', 10, 200000, 300, 0, now(), now() + interval '60 days', 'active'),
  ('PLAT15', 'Đặc quyền Bạch Kim - Giảm 15%', 'percent', 15, 300000, 100, 0, now(), now() + interval '60 days', 'active'),
  ('DIAMOND20', 'Đặc quyền Kim Cương - Giảm 20%', 'percent', 20, 200000, 50, 0, now(), now() + interval '90 days', 'active'),

  -- === FIXED amount discount vouchers ===
  ('SAVE30K', 'Giảm ngay 30.000đ', 'fixed', 30000, 200000, 1000, 0, now(), now() + interval '30 days', 'active'),
  ('SAVE50K', 'Giảm 50.000đ cho đơn từ 300K', 'fixed', 50000, 300000, 500, 0, now(), now() + interval '30 days', 'active'),
  ('SAVE100K', 'Giảm 100.000đ cho đơn từ 500K', 'fixed', 100000, 500000, 200, 0, now(), now() + interval '21 days', 'active'),
  ('SAVE200K', 'Mega Sale - Giảm 200.000đ', 'fixed', 200000, 1000000, 50, 0, now(), now() + interval '14 days', 'active'),
  ('NEWBIE50K', 'Ưu đãi người mới - Giảm 50K', 'fixed', 50000, 250000, 1500, 0, now(), now() + interval '60 days', 'active'),
  ('BIRTHDAY100', 'Quà sinh nhật - Giảm 100K', 'fixed', 100000, 300000, 500, 0, now(), now() + interval '365 days', 'active'),
  ('LOYALTY150', 'Tri ân khách hàng - Giảm 150K', 'fixed', 150000, 700000, 100, 0, now(), now() + interval '30 days', 'active'),
  ('WEEKEND80', 'Ưu đãi cuối tuần - Giảm 80K', 'fixed', 80000, 350000, 400, 0, now(), now() + interval '30 days', 'active')
on conflict (code) do update set
  title = excluded.title,
  discount_type = excluded.discount_type,
  discount_value = excluded.discount_value,
  min_order = excluded.min_order,
  quota = excluded.quota,
  starts_at = excluded.starts_at,
  expires_at = excluded.expires_at,
  status = excluded.status;

-- ============================================================================
-- 5. STOCK ROLLBACK ON ORDER CANCELLATION
-- ============================================================================

create or replace function public.rollback_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products p
    set stock = p.stock + oi.quantity
    from public.order_items oi
    where oi.order_id = new.id
      and p.id = oi.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rollback_stock_on_cancel on public.orders;
create trigger trg_rollback_stock_on_cancel
  after update of status on public.orders
  for each row
  when (new.status = 'cancelled' and old.status <> 'cancelled')
  execute function public.rollback_stock_on_cancel();

commit;
