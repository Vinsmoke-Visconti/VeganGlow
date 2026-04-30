# VietQR Payment Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake `setTimeout` payment verification in checkout with a production-grade PayOS-driven VietQR flow: stock reservation with 15-min expiry, HMAC-verified webhooks, strict amount+memo matching, and Realtime UI updates.

**Architecture:** Server action creates order + reserves stock atomically. Edge Functions handle all PayOS interactions (create-link, webhook, status, cancel) with `service_role`. pg_cron expires unpaid intents. Frontend uses Realtime subscription with 10s polling fallback. See spec at `docs/superpowers/specs/2026-04-30-vietqr-payment-redesign.md`.

**Tech Stack:** Supabase (Postgres + Edge Functions + Realtime + pg_cron), Deno, Next.js 16 App Router, PayOS SDK, Vitest (new for this project), Deno.test.

---

## File Structure

### Backend (Supabase)

| Path | Action | Responsibility |
|---|---|---|
| `apps/backend/supabase/migrations/00017_payment_system.sql` | Create | Schema: extend orders/products, new tables, RPCs |
| `apps/backend/supabase/migrations/00018_payment_cron.sql` | Create | pg_cron job for expiry |
| `apps/backend/supabase/functions/_shared/crypto.ts` | Create | HMAC SHA256 + constant-time compare |
| `apps/backend/supabase/functions/_shared/payos.ts` | Create | PayOS REST client (createPaymentLink, cancel) |
| `apps/backend/supabase/functions/payment-create/index.ts` | Create | Create payment intent |
| `apps/backend/supabase/functions/payment-webhook/index.ts` | Create | Receive bank webhook (public) |
| `apps/backend/supabase/functions/payment-status/index.ts` | Create | Read-only status endpoint |
| `apps/backend/supabase/functions/payment-cancel/index.ts` | Create | User-initiated cancel |
| `apps/backend/supabase/functions/checkout/` | Delete | Orphan code (server action uses RPC directly) |

### Frontend (Next.js)

| Path | Action | Responsibility |
|---|---|---|
| `apps/web/src/app/actions/checkout.ts` | Modify | Switch RPC name + return `expires_at` |
| `apps/web/src/app/api/payment/create/route.ts` | Create | Proxy to payment-create Edge Fn |
| `apps/web/src/app/api/payment/status/route.ts` | Create | Proxy to payment-status Edge Fn |
| `apps/web/src/app/api/payment/cancel/route.ts` | Create | Proxy to payment-cancel Edge Fn |
| `apps/web/src/lib/payment.ts` | Create | Client wrapper for payment APIs |
| `apps/web/src/hooks/usePaymentStatus.ts` | Create | Realtime + polling fallback |
| `apps/web/src/components/payment/VietQRPanel.tsx` | Create | QR + countdown UI |
| `apps/web/src/components/payment/PaymentCountdown.tsx` | Create | Countdown timer |
| `apps/web/src/components/payment/payment.module.css` | Create | Styles |
| `apps/web/src/app/(storefront)/checkout/[orderCode]/payment/page.tsx` | Create | Dedicated VietQR route |
| `apps/web/src/app/(storefront)/checkout/page.tsx` | Modify | Remove fake QR; redirect on bank_transfer |
| `apps/web/src/lib/email.ts` | Modify | Add `sendPaymentSuccessEmail` |

### Tests

| Path | Action |
|---|---|
| `apps/web/vitest.config.ts` | Create |
| `apps/web/src/hooks/usePaymentStatus.test.ts` | Create |
| `apps/web/src/lib/payment.test.ts` | Create |
| `apps/backend/supabase/functions/_shared/crypto.test.ts` | Create (Deno.test) |
| `apps/backend/supabase/functions/payment-webhook/index.test.ts` | Create (Deno.test) |
| `apps/backend/supabase/tests/payment_rpcs.sql` | Create (pgTAP-style assertions) |

---

# Phase 1 — Database Foundation

## Task 1: Migration scaffold + extend orders & products

**Files:**
- Create: `apps/backend/supabase/migrations/00017_payment_system.sql`

- [ ] **Step 1: Create migration file with header and order/product extensions**

```sql
-- 00017_payment_system.sql
-- VeganGlow VietQR payment system: stock reservation, payment intents,
-- transaction audit log, dispute tracking. Replaces the immediate-decrement
-- behavior of decrement_stock_and_create_order with a reserve-then-commit
-- model that supports auto-expiry of unpaid bank_transfer orders.

begin;

-- Backfill rows BEFORE swapping the CHECK constraint.
update public.orders
  set payment_method = 'bank_transfer'
  where payment_method = 'card';

alter table public.orders
  drop constraint if exists orders_payment_method_check,
  add constraint orders_payment_method_check
    check (payment_method in ('cod', 'bank_transfer'));

alter table public.orders
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'expired', 'failed', 'refunded')),
  add column if not exists paid_at timestamptz,
  add column if not exists expires_at timestamptz;

create index if not exists orders_payment_status_idx
  on public.orders(payment_status);
create index if not exists orders_pending_expires_idx
  on public.orders(expires_at)
  where payment_status = 'pending';

alter table public.products
  add column if not exists reserved_stock integer not null default 0
    check (reserved_stock >= 0);

-- Defensive: reserved_stock must never exceed stock at row level.
-- (Multi-row constraints enforced by the RPCs.)
alter table public.products
  add constraint if not exists products_reserved_lte_stock
  check (reserved_stock <= stock);

commit;
```

- [ ] **Step 2: Apply locally and verify schema**

```bash
npm run db:reset
psql "$DATABASE_URL" -c "\d+ public.orders" | grep -E "payment_status|paid_at|expires_at"
psql "$DATABASE_URL" -c "\d+ public.products" | grep reserved_stock
```

Expected output: all three new columns on `orders` plus `reserved_stock` on `products`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/supabase/migrations/00017_payment_system.sql
git commit -m "feat(db): extend orders & products for payment state model

- Add payment_status, paid_at, expires_at to orders
- Rename existing payment_method='card' to 'bank_transfer'
- Add reserved_stock counter to products with row-level CHECK"
```

---

## Task 2: Add payment_intents, payment_transactions, payment_disputes tables

**Files:**
- Modify: `apps/backend/supabase/migrations/00017_payment_system.sql`

- [ ] **Step 1: Append the three new tables to the migration**

Append AFTER the `commit;` of Task 1 (replace it with a new transaction block):

```sql
-- ---------- payment_intents (1-1 with order) ----------
begin;

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null default 'payos' check (provider in ('payos')),
  provider_order_code bigint not null unique,
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  qr_code text not null,
  checkout_url text not null,
  expires_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'expired', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists payment_intents_status_idx
  on public.payment_intents(status);

-- ---------- payment_transactions (audit + idempotency) ----------
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  provider text not null default 'payos',
  provider_ref text not null,
  amount numeric(12,2) not null,
  status text not null,
  raw_payload jsonb not null,
  signature text,
  processed_at timestamptz not null default now(),
  unique (provider, provider_ref)
);

create index if not exists payment_transactions_order_idx
  on public.payment_transactions(order_id);

-- ---------- payment_disputes ----------
create table if not exists public.payment_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider_ref text not null,
  expected_amount numeric(12,2) not null,
  received_amount numeric(12,2) not null,
  reason text not null check (reason in (
    'amount_mismatch','memo_not_found','late_payment','duplicate_payment'
  )),
  resolved boolean not null default false,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists payment_disputes_unresolved_idx
  on public.payment_disputes(created_at desc) where resolved = false;

-- ---------- RLS: deny-all (service_role only) ----------
alter table public.payment_intents      enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_disputes     enable row level security;

-- No policies: everything goes through Edge Functions with service_role,
-- or through specific RPCs that use SECURITY DEFINER.

commit;
```

- [ ] **Step 2: Re-apply and verify**

```bash
npm run db:reset
psql "$DATABASE_URL" -c "\dt public.payment_*"
psql "$DATABASE_URL" -c "select tablename, rowsecurity from pg_tables where tablename like 'payment_%';"
```

Expected: 3 tables listed, all with `rowsecurity = t`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/supabase/migrations/00017_payment_system.sql
git commit -m "feat(db): add payment_intents, payment_transactions, payment_disputes

- payment_intents: 1-1 with order, holds QR + expires_at
- payment_transactions: idempotency-keyed audit log via UNIQUE (provider, provider_ref)
- payment_disputes: tracks amount/memo mismatches and late/duplicate payments
- All three are RLS-enabled with no policies (service_role / SECURITY DEFINER only)"
```

---

## Task 3: RPC `reserve_stock_and_create_order`

**Files:**
- Modify: `apps/backend/supabase/migrations/00017_payment_system.sql`
- Test: `apps/backend/supabase/tests/payment_rpcs.sql` (Create)

- [ ] **Step 1: Write the failing test (SQL assertions)**

Create `apps/backend/supabase/tests/payment_rpcs.sql`:

```sql
-- Manual test runner: psql -f apps/backend/supabase/tests/payment_rpcs.sql
-- Each section asserts one behavior; failure raises NOTICE + exits non-zero.

\set ON_ERROR_STOP on

-- Setup
insert into public.categories (id, name, slug)
  values ('00000000-0000-0000-0000-0000000000c1', 'Test Cat', 'test-cat')
  on conflict (id) do nothing;

insert into public.products (id, category_id, name, slug, price, stock, is_active)
  values ('00000000-0000-0000-0000-0000000000a1',
          '00000000-0000-0000-0000-0000000000c1',
          'Test Product', 'test-product', 100000, 10, true)
  on conflict (id) do update set stock = 10, reserved_stock = 0, is_active = true;

-- ---- Test: reserve_stock_and_create_order increments reserved_stock ----
do $$
declare
  v_result record;
  v_reserved integer;
begin
  select * into v_result from public.reserve_stock_and_create_order(
    jsonb_build_object('name','T','phone','0901234567','email','t@t.t',
      'address','x','ward','w','ward_code','1','province','p','province_code','2','note',''),
    jsonb_build_array(jsonb_build_object('id','00000000-0000-0000-0000-0000000000a1','quantity',3)),
    'bank_transfer'
  );

  if v_result.order_code is null then raise exception 'no order_code returned'; end if;
  if v_result.expires_at is null or v_result.expires_at < now() then
    raise exception 'expires_at not set in future';
  end if;

  select reserved_stock into v_reserved from public.products
    where id = '00000000-0000-0000-0000-0000000000a1';
  if v_reserved <> 3 then raise exception 'expected reserved=3, got %', v_reserved; end if;

  raise notice 'PASS: bank_transfer reserves stock';
end $$;

-- ---- Test: insufficient available stock raises ----
do $$
begin
  begin
    perform public.reserve_stock_and_create_order(
      jsonb_build_object('name','T','phone','0901234567','email','t@t.t',
        'address','x','ward','w','ward_code','1','province','p','province_code','2','note',''),
      jsonb_build_array(jsonb_build_object('id','00000000-0000-0000-0000-0000000000a1','quantity',999)),
      'bank_transfer'
    );
    raise exception 'expected INSUFFICIENT_STOCK but did not raise';
  exception when others then
    if sqlerrm not like 'INSUFFICIENT_STOCK:%' then
      raise exception 'wrong error: %', sqlerrm;
    end if;
    raise notice 'PASS: insufficient stock raises';
  end;
end $$;
```

- [ ] **Step 2: Run test to verify it fails (RPC doesn't exist yet)**

```bash
psql "$DATABASE_URL" -f apps/backend/supabase/tests/payment_rpcs.sql
```

Expected: ERROR — `function public.reserve_stock_and_create_order(...) does not exist`.

- [ ] **Step 3: Append RPC to migration**

Append to `apps/backend/supabase/migrations/00017_payment_system.sql` (new transaction):

```sql
begin;

create or replace function public.reserve_stock_and_create_order(
  p_customer       jsonb,
  p_items          jsonb,
  p_payment_method text
) returns table(order_id uuid, order_code text, total_amount numeric, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_code       text;
  v_order_id   uuid;
  v_total      numeric(12,2) := 0;
  v_product    record;
  v_expires    timestamptz := null;
begin
  if p_payment_method not in ('cod', 'bank_transfer') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = '22023';
  end if;

  create temp table _checkout_items (
    product_id uuid primary key,
    quantity   integer not null check (quantity > 0)
  ) on commit drop;

  insert into _checkout_items (product_id, quantity)
  select (e->>'id')::uuid, (e->>'quantity')::integer
  from jsonb_array_elements(p_items) e
  on conflict (product_id) do update
    set quantity = _checkout_items.quantity + excluded.quantity;

  for v_product in
    select p.id, p.name, p.image, p.price, p.stock, p.reserved_stock,
           p.is_active, ci.quantity
    from public.products p
    join _checkout_items ci on ci.product_id = p.id
    order by p.id
    for update of p
  loop
    if not v_product.is_active then
      raise exception 'PRODUCT_INACTIVE:%', v_product.name using errcode = '22023';
    end if;
    if (v_product.stock - v_product.reserved_stock) < v_product.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product.name using errcode = '22023';
    end if;
    v_total := v_total + v_product.price * v_product.quantity;
  end loop;

  if v_total = 0 then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = '22023';
  end if;

  v_code := 'VG-'
         || upper(to_hex((extract(epoch from now()) * 1000)::bigint))
         || '-'
         || upper(to_hex((random() * 65535)::int));

  if p_payment_method = 'bank_transfer' then
    v_expires := now() + interval '15 minutes';
  end if;

  insert into public.orders (
    code, user_id, customer_name, phone, email, address,
    city, ward, ward_code, province, province_code, note,
    payment_method, payment_status, total_amount, expires_at
  ) values (
    v_code, v_user_id,
    p_customer->>'name',
    p_customer->>'phone',
    p_customer->>'email',
    p_customer->>'address',
    p_customer->>'province',
    p_customer->>'ward',
    p_customer->>'ward_code',
    p_customer->>'province',
    p_customer->>'province_code',
    nullif(p_customer->>'note', ''),
    p_payment_method,
    case p_payment_method when 'bank_transfer' then 'pending' else 'unpaid' end,
    v_total,
    v_expires
  ) returning id into v_order_id;

  insert into public.order_items
    (order_id, product_id, product_name, product_image, unit_price, quantity)
  select v_order_id, p.id, p.name, p.image, p.price, ci.quantity
  from public.products p
  join _checkout_items ci on ci.product_id = p.id;

  -- Reserve (not decrement) — stays in reserved_stock until commit_paid_order
  -- or release_reserved_stock.
  update public.products p
     set reserved_stock = p.reserved_stock + ci.quantity
    from _checkout_items ci
   where p.id = ci.product_id;

  return query select v_order_id, v_code, v_total, v_expires;
end $$;

revoke all on function public.reserve_stock_and_create_order(jsonb, jsonb, text) from public;
grant execute on function public.reserve_stock_and_create_order(jsonb, jsonb, text)
  to authenticated, anon, service_role;

commit;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run db:reset
psql "$DATABASE_URL" -f apps/backend/supabase/tests/payment_rpcs.sql
```

Expected: `PASS: bank_transfer reserves stock` and `PASS: insufficient stock raises`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/supabase/migrations/00017_payment_system.sql apps/backend/supabase/tests/payment_rpcs.sql
git commit -m "feat(db): add reserve_stock_and_create_order RPC

Replaces decrement_stock_and_create_order. For bank_transfer orders,
increments products.reserved_stock instead of decrementing stock; sets
orders.expires_at = now() + 15min. Validates available = stock - reserved
under FOR UPDATE locks."
```

---

## Task 4: RPC `commit_paid_order`

**Files:**
- Modify: `apps/backend/supabase/migrations/00017_payment_system.sql`
- Modify: `apps/backend/supabase/tests/payment_rpcs.sql`

- [ ] **Step 1: Add failing test**

Append to `payment_rpcs.sql`:

```sql
-- ---- Test: commit_paid_order moves stock and flips status ----
do $$
declare
  v_order   record;
  v_stock   integer;
  v_reserved integer;
begin
  -- Reuse the order from earlier test (reserved=3)
  select id into v_order from public.orders order by created_at desc limit 1;
  perform public.commit_paid_order(v_order.id);

  select stock, reserved_stock into v_stock, v_reserved
    from public.products where id = '00000000-0000-0000-0000-0000000000a1';
  if v_stock <> 7 then raise exception 'expected stock=7, got %', v_stock; end if;
  if v_reserved <> 0 then raise exception 'expected reserved=0, got %', v_reserved; end if;

  if (select payment_status from public.orders where id = v_order.id) <> 'paid' then
    raise exception 'payment_status not paid';
  end if;
  if (select status from public.orders where id = v_order.id) <> 'confirmed' then
    raise exception 'workflow status not confirmed';
  end if;

  raise notice 'PASS: commit_paid_order debits stock and flips status';
end $$;

-- ---- Test: commit_paid_order is idempotent (raises ALREADY_PAID) ----
do $$
declare
  v_order_id uuid;
begin
  select id into v_order_id from public.orders order by created_at desc limit 1;
  begin
    perform public.commit_paid_order(v_order_id);
    raise exception 'expected ALREADY_PAID';
  exception when others then
    if sqlerrm <> 'ALREADY_PAID' then
      raise exception 'wrong error: %', sqlerrm;
    end if;
    raise notice 'PASS: commit_paid_order idempotency guard';
  end;
end $$;
```

- [ ] **Step 2: Run test to verify it fails**

```bash
psql "$DATABASE_URL" -f apps/backend/supabase/tests/payment_rpcs.sql
```

Expected: error `function commit_paid_order(...) does not exist`.

- [ ] **Step 3: Append RPC**

Append to migration `00017`:

```sql
begin;

create or replace function public.commit_paid_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  -- Lock the order row first
  select payment_status into v_status from public.orders
    where id = p_order_id for update;

  if v_status is null then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_status = 'paid' then
    raise exception 'ALREADY_PAID' using errcode = '22023';
  end if;
  if v_status not in ('pending', 'unpaid') then
    raise exception 'INVALID_STATE:%', v_status using errcode = '22023';
  end if;

  -- Move reserved → committed (stock down, reserved down)
  update public.products p
     set stock          = p.stock          - oi.quantity,
         reserved_stock = greatest(0, p.reserved_stock - oi.quantity)
    from public.order_items oi
   where oi.order_id = p_order_id
     and p.id = oi.product_id;

  update public.orders
     set payment_status = 'paid',
         paid_at        = now(),
         status         = 'confirmed'
   where id = p_order_id;

  update public.payment_intents
     set status = 'paid'
   where order_id = p_order_id;
end $$;

revoke all on function public.commit_paid_order(uuid) from public;
grant execute on function public.commit_paid_order(uuid) to service_role;

commit;
```

- [ ] **Step 4: Re-run test**

```bash
npm run db:reset
psql "$DATABASE_URL" -f apps/backend/supabase/tests/payment_rpcs.sql
```

Expected: both new PASS notices.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/supabase/migrations/00017_payment_system.sql apps/backend/supabase/tests/payment_rpcs.sql
git commit -m "feat(db): add commit_paid_order RPC

Atomically debits products.stock and reserved_stock by order quantities,
flips payment_status to 'paid' + workflow status to 'confirmed', and marks
the payment_intent paid. Guards against double-commit with ALREADY_PAID."
```

---

## Task 5: RPC `release_reserved_stock`

**Files:**
- Modify: `apps/backend/supabase/migrations/00017_payment_system.sql`
- Modify: `apps/backend/supabase/tests/payment_rpcs.sql`

- [ ] **Step 1: Add failing test**

Append to `payment_rpcs.sql`:

```sql
-- ---- Test: release_reserved_stock returns reserve and marks expired ----
do $$
declare
  v_order_id uuid;
  v_reserved integer;
begin
  -- Create a fresh pending order
  perform public.reserve_stock_and_create_order(
    jsonb_build_object('name','T','phone','0901234567','email','t@t.t',
      'address','x','ward','w','ward_code','1','province','p','province_code','2','note',''),
    jsonb_build_array(jsonb_build_object('id','00000000-0000-0000-0000-0000000000a1','quantity',2)),
    'bank_transfer'
  );
  select id into v_order_id from public.orders
    where payment_status = 'pending' order by created_at desc limit 1;

  perform public.release_reserved_stock(v_order_id);

  select reserved_stock into v_reserved from public.products
    where id = '00000000-0000-0000-0000-0000000000a1';
  if v_reserved <> 0 then raise exception 'expected reserved=0, got %', v_reserved; end if;

  if (select payment_status from public.orders where id = v_order_id) <> 'expired' then
    raise exception 'not expired';
  end if;
  if (select status from public.orders where id = v_order_id) <> 'cancelled' then
    raise exception 'workflow not cancelled';
  end if;

  raise notice 'PASS: release_reserved_stock returns reserve';
end $$;
```

- [ ] **Step 2: Run test to verify failure**

```bash
psql "$DATABASE_URL" -f apps/backend/supabase/tests/payment_rpcs.sql
```

Expected: `function release_reserved_stock(uuid) does not exist`.

- [ ] **Step 3: Append RPC**

Append to migration `00017`:

```sql
begin;

create or replace function public.release_reserved_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select payment_status into v_status from public.orders
    where id = p_order_id for update;

  if v_status is null then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_status <> 'pending' then
    -- already paid/expired/cancelled — no-op (idempotent)
    return;
  end if;

  update public.products p
     set reserved_stock = greatest(0, p.reserved_stock - oi.quantity)
    from public.order_items oi
   where oi.order_id = p_order_id
     and p.id = oi.product_id;

  update public.orders
     set payment_status = 'expired',
         status         = 'cancelled'
   where id = p_order_id;

  update public.payment_intents
     set status = 'expired'
   where order_id = p_order_id;
end $$;

revoke all on function public.release_reserved_stock(uuid) from public;
grant execute on function public.release_reserved_stock(uuid) to service_role;

commit;
```

- [ ] **Step 4: Re-run tests**

```bash
npm run db:reset
psql "$DATABASE_URL" -f apps/backend/supabase/tests/payment_rpcs.sql
```

Expected: all three previous PASSes plus the new one.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/supabase/migrations/00017_payment_system.sql apps/backend/supabase/tests/payment_rpcs.sql
git commit -m "feat(db): add release_reserved_stock RPC

Reverses a pending order: returns reserved_stock to the available pool,
flips payment_status to 'expired' and workflow status to 'cancelled'.
Idempotent — silently no-ops on already-terminal orders."
```

---

## Task 6: pg_cron expiry job (migration 00018)

**Files:**
- Create: `apps/backend/supabase/migrations/00018_payment_cron.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 00018_payment_cron.sql
-- pg_cron job: every minute, expire pending bank_transfer orders past
-- expires_at and release their reserved stock.

create extension if not exists pg_cron;

create or replace function public.expire_pending_payments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_id    uuid;
begin
  for v_id in
    select id from public.orders
    where payment_status = 'pending'
      and expires_at is not null
      and expires_at < now()
    order by expires_at
    for update skip locked
    limit 200
  loop
    perform public.release_reserved_stock(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke all on function public.expire_pending_payments() from public;
grant execute on function public.expire_pending_payments() to service_role;

-- Idempotent schedule (drop-and-recreate on rerun)
do $$
begin
  perform cron.unschedule('expire-pending-payments')
    where exists (select 1 from cron.job where jobname = 'expire-pending-payments');
exception when others then null;
end $$;

select cron.schedule(
  'expire-pending-payments',
  '* * * * *',
  $$select public.expire_pending_payments()$$
);
```

- [ ] **Step 2: Apply and verify the job is scheduled**

```bash
npm run db:reset
psql "$DATABASE_URL" -c "select jobname, schedule, active from cron.job where jobname = 'expire-pending-payments';"
```

Expected: one row, `active = t`, schedule `* * * * *`.

- [ ] **Step 3: Manually exercise the function**

```bash
psql "$DATABASE_URL" <<SQL
-- Create an expired-by-construction pending order
insert into public.orders (
  code, customer_name, phone, address, city, payment_method,
  payment_status, total_amount, expires_at
) values (
  'VG-TEST-EXPIRED', 'X', '0901234567', 'x', 'x',
  'bank_transfer', 'pending', 100, now() - interval '1 hour'
);

select public.expire_pending_payments();

select payment_status, status from public.orders where code = 'VG-TEST-EXPIRED';
SQL
```

Expected: `expire_pending_payments` returns `1`, then row shows `expired | cancelled`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/supabase/migrations/00018_payment_cron.sql
git commit -m "feat(db): add pg_cron job to expire pending payments

Runs every minute. Picks up to 200 orders with payment_status='pending'
and expires_at past now() using FOR UPDATE SKIP LOCKED, then calls
release_reserved_stock on each."
```

---

## Task 7: Regenerate Supabase types

**Files:**
- Modify: `apps/web/src/types/database.ts` (auto-regenerated)

- [ ] **Step 1: Regenerate types**

```bash
npm run db:types
```

- [ ] **Step 2: Verify the new tables and RPCs appear**

```bash
grep -E "payment_intents|payment_transactions|payment_disputes|reserve_stock_and_create_order|commit_paid_order|release_reserved_stock" apps/web/src/types/database.ts | head -20
```

Expected: each name appears at least once.

- [ ] **Step 3: Run type-check to confirm no breakage**

```bash
npm run type-check
```

Expected: passes (the existing `decrement_stock_and_create_order` cast in `actions/checkout.ts` will be replaced in Task 16; for now the cast keeps it compiling).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/types/database.ts
git commit -m "chore(db): regenerate Supabase types for payment system"
```

---

# Phase 2 — Edge Functions

## Task 8: Shared crypto helper (HMAC + constant-time compare)

**Files:**
- Create: `apps/backend/supabase/functions/_shared/crypto.ts`
- Create: `apps/backend/supabase/functions/_shared/crypto.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// apps/backend/supabase/functions/_shared/crypto.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { hmacSHA256Hex, constantTimeEqual } from './crypto.ts';

Deno.test('hmacSHA256Hex matches a known vector', async () => {
  // RFC 4231 test case 1 (key/data swapped order check)
  const key = '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b';
  const data = 'Hi There';
  const result = await hmacSHA256Hex(key, data);
  // sha256 hex of HMAC("0b"*20, "Hi There") = b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7
  assertEquals(result, 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
});

Deno.test('constantTimeEqual returns true for equal strings', () => {
  assertEquals(constantTimeEqual('abc123', 'abc123'), true);
});

Deno.test('constantTimeEqual returns false for different strings of same length', () => {
  assertEquals(constantTimeEqual('abc123', 'abc124'), false);
});

Deno.test('constantTimeEqual returns false for different lengths', () => {
  assertEquals(constantTimeEqual('abc', 'abcd'), false);
});
```

- [ ] **Step 2: Run failing test**

```bash
cd apps/backend/supabase/functions/_shared && deno test crypto.test.ts
```

Expected: error — module `./crypto.ts` does not exist.

- [ ] **Step 3: Write the implementation**

```ts
// apps/backend/supabase/functions/_shared/crypto.ts
const encoder = new TextEncoder();

export async function hmacSHA256Hex(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  const bytes = new Uint8Array(sigBuf);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
deno test apps/backend/supabase/functions/_shared/crypto.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/supabase/functions/_shared/crypto.ts apps/backend/supabase/functions/_shared/crypto.test.ts
git commit -m "feat(edge): add HMAC SHA256 + constant-time compare helpers"
```

---

## Task 9: PayOS API client wrapper

**Files:**
- Create: `apps/backend/supabase/functions/_shared/payos.ts`

- [ ] **Step 1: Write the wrapper**

```ts
// apps/backend/supabase/functions/_shared/payos.ts
// Thin REST client over PayOS v2 API. We don't use the official SDK to keep
// the Deno bundle lean and avoid Node-shim issues.
//
// Docs: https://payos.vn/docs

import { hmacSHA256Hex } from './crypto.ts';

const BASE = 'https://api-merchant.payos.vn';

export interface CreatePaymentLinkInput {
  orderCode: number;          // int64, must be unique per merchant
  amount: number;             // VND, integer
  description: string;        // <= 25 chars; we use the order code (e.g., VG-XXXX)
  returnUrl: string;
  cancelUrl: string;
  expiredAt?: number;         // unix seconds
}

export interface CreatePaymentLinkResult {
  bin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  orderCode: number;
  currency: string;
  paymentLinkId: string;
  status: string;
  checkoutUrl: string;
  qrCode: string;             // raw NAPAS string suitable for QR rendering
}

function clientId() { return Deno.env.get('PAYOS_CLIENT_ID')!; }
function apiKey() { return Deno.env.get('PAYOS_API_KEY')!; }
function checksumKey() { return Deno.env.get('PAYOS_CHECKSUM_KEY')!; }

// Signature scheme per PayOS docs: alphabetical concat of fields with '&'
async function signCreatePayment(input: CreatePaymentLinkInput): Promise<string> {
  const raw =
    `amount=${input.amount}` +
    `&cancelUrl=${input.cancelUrl}` +
    `&description=${input.description}` +
    `&orderCode=${input.orderCode}` +
    `&returnUrl=${input.returnUrl}`;
  return await hmacSHA256Hex(checksumKey(), raw);
}

export async function createPaymentLink(
  input: CreatePaymentLinkInput,
): Promise<CreatePaymentLinkResult> {
  const signature = await signCreatePayment(input);
  const res = await fetch(`${BASE}/v2/payment-requests`, {
    method: 'POST',
    headers: {
      'x-client-id': clientId(),
      'x-api-key': apiKey(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ...input, signature }),
  });

  const json = await res.json();
  if (!res.ok || json.code !== '00') {
    throw new Error(`PayOS createPaymentLink failed: ${json.code} ${json.desc}`);
  }
  return json.data as CreatePaymentLinkResult;
}

export async function cancelPaymentLink(
  orderCode: number,
  reason: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/v2/payment-requests/${orderCode}/cancel`,
    {
      method: 'POST',
      headers: {
        'x-client-id': clientId(),
        'x-api-key': apiKey(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ cancellationReason: reason }),
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PayOS cancelPaymentLink failed: ${res.status} ${txt}`);
  }
}

// Webhook signature verification — PayOS sends signature in the body.data
// path or header, depending on version. We verify the canonical string
// derived from sorted-key concat of the data object.
export async function verifyWebhookSignature(
  data: Record<string, unknown>,
  receivedSignature: string,
): Promise<boolean> {
  const sortedKeys = Object.keys(data).sort();
  const raw = sortedKeys
    .map((k) => `${k}=${data[k] === null || data[k] === undefined ? '' : String(data[k])}`)
    .join('&');
  const expected = await hmacSHA256Hex(checksumKey(), raw);
  return expected === receivedSignature;
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/backend/supabase/functions && deno check _shared/payos.ts
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/supabase/functions/_shared/payos.ts
git commit -m "feat(edge): add PayOS REST client and webhook verifier"
```

---

## Task 10: Edge Function `payment-create`

**Files:**
- Create: `apps/backend/supabase/functions/payment-create/index.ts`

- [ ] **Step 1: Write the function**

```ts
// Edge Function: payment-create
// POST /functions/v1/payment-create
// Body: { order_id: string }
// Auth: requires Authorization header (Supabase user JWT) — RLS confirms ownership.
//
// Reads the order, calls PayOS createPaymentLink, persists payment_intents,
// returns { qrCode, checkoutUrl, expiresAt, providerOrderCode }.

import { buildCorsHeaders } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';
import { createPaymentLink } from '../_shared/payos.ts';

interface Body { order_id: string }

Deno.serve(async (req: Request) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST')
    return new Response('method not allowed', { status: 405, headers: cors });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return new Response(JSON.stringify({ error: 'unauthorized' }),
      { status: 401, headers: { ...cors, 'content-type': 'application/json' } });

    const userClient = createUserClient(auth);
    const admin = createAdminClient();

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    // Note: guest checkout uses anon JWT — `user` may be null but we still
    // proceed; ownership check happens via order.user_id match below if present.

    const { order_id } = (await req.json()) as Body;
    if (!order_id)
      return new Response(JSON.stringify({ error: 'missing order_id' }),
        { status: 400, headers: { ...cors, 'content-type': 'application/json' } });

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, code, total_amount, payment_method, payment_status, user_id, expires_at')
      .eq('id', order_id)
      .single();

    if (orderErr || !order)
      return new Response(JSON.stringify({ error: 'order not found' }),
        { status: 404, headers: { ...cors, 'content-type': 'application/json' } });

    if (order.user_id && (!user || order.user_id !== user.id))
      return new Response(JSON.stringify({ error: 'forbidden' }),
        { status: 403, headers: { ...cors, 'content-type': 'application/json' } });

    if (order.payment_method !== 'bank_transfer')
      return new Response(JSON.stringify({ error: 'not a bank_transfer order' }),
        { status: 400, headers: { ...cors, 'content-type': 'application/json' } });

    if (order.payment_status !== 'pending')
      return new Response(JSON.stringify({ error: `order is ${order.payment_status}` }),
        { status: 409, headers: { ...cors, 'content-type': 'application/json' } });

    // Idempotent: if intent already exists, return it
    const { data: existing } = await admin
      .from('payment_intents')
      .select('qr_code, checkout_url, expires_at, provider_order_code')
      .eq('order_id', order.id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({
        qrCode: existing.qr_code,
        checkoutUrl: existing.checkout_url,
        expiresAt: existing.expires_at,
        providerOrderCode: existing.provider_order_code,
      }), { headers: { ...cors, 'content-type': 'application/json' } });
    }

    const providerOrderCode = Math.floor(Math.random() * 9_000_000_000_000_000) + 1_000_000;
    const expiredAtUnix = Math.floor(new Date(order.expires_at!).getTime() / 1000);
    const origin = Deno.env.get('STOREFRONT_ORIGIN') ?? '';

    const link = await createPaymentLink({
      orderCode: providerOrderCode,
      amount: Math.round(Number(order.total_amount)),
      description: order.code.slice(0, 25),
      returnUrl: `${origin}/checkout/${order.code}/payment?status=success`,
      cancelUrl: `${origin}/checkout/${order.code}/payment?status=cancelled`,
      expiredAt: expiredAtUnix,
    });

    await admin.from('payment_intents').insert({
      order_id: order.id,
      provider: 'payos',
      provider_order_code: providerOrderCode,
      amount: order.total_amount,
      description: order.code,
      qr_code: link.qrCode,
      checkout_url: link.checkoutUrl,
      expires_at: order.expires_at!,
    });

    return new Response(JSON.stringify({
      qrCode: link.qrCode,
      checkoutUrl: link.checkoutUrl,
      expiresAt: order.expires_at,
      providerOrderCode,
    }), { headers: { ...cors, 'content-type': 'application/json' } });

  } catch (err) {
    console.error('payment-create error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...cors, 'content-type': 'application/json' } });
  }
});
```

- [ ] **Step 2: Type-check**

```bash
deno check apps/backend/supabase/functions/payment-create/index.ts
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/supabase/functions/payment-create/index.ts
git commit -m "feat(edge): add payment-create function (PayOS link + intent persist)"
```

---

## Task 11: Edge Function `payment-webhook`

**Files:**
- Create: `apps/backend/supabase/functions/payment-webhook/index.ts`
- Create: `apps/backend/supabase/functions/payment-webhook/index.test.ts`

- [ ] **Step 1: Write failing test (Deno.test with mocked admin client)**

```ts
// apps/backend/supabase/functions/payment-webhook/index.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { decideOutcome } from './logic.ts';

Deno.test('decideOutcome: missing intent → orphan', () => {
  const r = decideOutcome({ amount: 100, description: 'VG-X' }, null);
  assertEquals(r.kind, 'orphan');
});

Deno.test('decideOutcome: amount mismatch → dispute amount_mismatch', () => {
  const r = decideOutcome(
    { amount: 99, description: 'VG-X' },
    { order_id: 'o1', amount: 100, description: 'VG-X', status: 'pending', expires_at: futureISO() },
  );
  assertEquals(r.kind, 'dispute');
  assertEquals(r.reason, 'amount_mismatch');
});

Deno.test('decideOutcome: memo missing → dispute memo_not_found', () => {
  const r = decideOutcome(
    { amount: 100, description: 'NHAM LAN' },
    { order_id: 'o1', amount: 100, description: 'VG-X', status: 'pending', expires_at: futureISO() },
  );
  assertEquals(r.kind, 'dispute');
  assertEquals(r.reason, 'memo_not_found');
});

Deno.test('decideOutcome: already paid → dispute duplicate_payment', () => {
  const r = decideOutcome(
    { amount: 100, description: 'VG-X' },
    { order_id: 'o1', amount: 100, description: 'VG-X', status: 'paid', expires_at: futureISO() },
  );
  assertEquals(r.kind, 'dispute');
  assertEquals(r.reason, 'duplicate_payment');
});

Deno.test('decideOutcome: expired intent → dispute late_payment', () => {
  const r = decideOutcome(
    { amount: 100, description: 'VG-X' },
    { order_id: 'o1', amount: 100, description: 'VG-X', status: 'pending', expires_at: pastISO() },
  );
  assertEquals(r.kind, 'dispute');
  assertEquals(r.reason, 'late_payment');
});

Deno.test('decideOutcome: all checks pass → commit', () => {
  const r = decideOutcome(
    { amount: 100, description: 'VG-X memo extra' },
    { order_id: 'o1', amount: 100, description: 'VG-X', status: 'pending', expires_at: futureISO() },
  );
  assertEquals(r.kind, 'commit');
  assertEquals(r.orderId, 'o1');
});

function futureISO() { return new Date(Date.now() + 5 * 60_000).toISOString(); }
function pastISO()   { return new Date(Date.now() - 5 * 60_000).toISOString(); }
```

- [ ] **Step 2: Run test to verify failure**

```bash
deno test apps/backend/supabase/functions/payment-webhook/index.test.ts
```

Expected: error — `./logic.ts` not found.

- [ ] **Step 3: Extract decision logic into pure module**

Create `apps/backend/supabase/functions/payment-webhook/logic.ts`:

```ts
export interface IncomingTx {
  amount: number;
  description: string;
}

export interface IntentRow {
  order_id: string;
  amount: number;
  description: string;
  status: string;
  expires_at: string;
}

export type Outcome =
  | { kind: 'orphan' }
  | { kind: 'dispute'; orderId: string; reason: 'amount_mismatch' | 'memo_not_found' | 'duplicate_payment' | 'late_payment' }
  | { kind: 'commit';  orderId: string };

export function decideOutcome(tx: IncomingTx, intent: IntentRow | null): Outcome {
  if (!intent) return { kind: 'orphan' };

  const amountOK = Number(tx.amount) === Number(intent.amount);
  const memoOK = String(tx.description ?? '').includes(intent.description);
  const expired = intent.status === 'expired'
    || new Date(intent.expires_at).getTime() < Date.now();
  const alreadyPaid = intent.status === 'paid';

  if (alreadyPaid) return { kind: 'dispute', orderId: intent.order_id, reason: 'duplicate_payment' };
  if (!amountOK)   return { kind: 'dispute', orderId: intent.order_id, reason: 'amount_mismatch' };
  if (!memoOK)     return { kind: 'dispute', orderId: intent.order_id, reason: 'memo_not_found' };
  if (expired)     return { kind: 'dispute', orderId: intent.order_id, reason: 'late_payment' };

  return { kind: 'commit', orderId: intent.order_id };
}
```

- [ ] **Step 4: Re-run tests**

```bash
deno test apps/backend/supabase/functions/payment-webhook/index.test.ts
```

Expected: 6 passed.

- [ ] **Step 5: Write the webhook handler**

```ts
// apps/backend/supabase/functions/payment-webhook/index.ts
// PUBLIC endpoint: PayOS POSTs webhook events here.
// Auth comes from HMAC signature, NOT bearer token.

import { createAdminClient } from '../_shared/supabase.ts';
import { hmacSHA256Hex, constantTimeEqual } from '../_shared/crypto.ts';
import { decideOutcome } from './logic.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const rawBody = await req.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody); }
  catch { return new Response('bad json', { status: 400 }); }

  const data = (payload as { data?: Record<string, unknown> }).data ?? {};
  const sig = (payload as { signature?: string }).signature
            ?? req.headers.get('x-payos-signature')
            ?? '';

  // Verify signature: PayOS computes HMAC over the sorted-key concat of `data`
  const sortedKeys = Object.keys(data).sort();
  const canonical = sortedKeys
    .map((k) => `${k}=${data[k] === null || data[k] === undefined ? '' : String(data[k])}`)
    .join('&');
  const expected = await hmacSHA256Hex(Deno.env.get('PAYOS_CHECKSUM_KEY')!, canonical);

  // Also support a rotating-key window
  const rotateKey = Deno.env.get('PAYOS_CHECKSUM_KEY_OLD');
  const expectedAlt = rotateKey ? await hmacSHA256Hex(rotateKey, canonical) : '';

  if (!constantTimeEqual(sig, expected) && (!expectedAlt || !constantTimeEqual(sig, expectedAlt))) {
    return new Response('invalid signature', { status: 401 });
  }

  const providerRef = String(data.reference ?? data.id ?? '');
  if (!providerRef) return new Response('missing ref', { status: 400 });

  const admin = createAdminClient();

  // Idempotency lookup
  const { data: dup } = await admin
    .from('payment_transactions')
    .select('id')
    .eq('provider', 'payos')
    .eq('provider_ref', providerRef)
    .maybeSingle();
  if (dup) return new Response('ok', { status: 200 });

  // Lookup intent
  const orderCode = Number(data.orderCode);
  const { data: intent } = await admin
    .from('payment_intents')
    .select('order_id, amount, description, status, expires_at')
    .eq('provider_order_code', orderCode)
    .maybeSingle();

  const outcome = decideOutcome(
    { amount: Number(data.amount), description: String(data.description ?? '') },
    intent,
  );

  // Always log the transaction
  await admin.from('payment_transactions').insert({
    order_id: outcome.kind === 'orphan' ? null : outcome.orderId,
    provider: 'payos',
    provider_ref: providerRef,
    amount: Number(data.amount),
    status: outcome.kind === 'commit' ? 'paid'
          : outcome.kind === 'orphan' ? 'orphan'
          : 'disputed',
    raw_payload: payload,
    signature: sig,
  });

  if (outcome.kind === 'dispute') {
    await admin.from('payment_disputes').insert({
      order_id: outcome.orderId,
      provider_ref: providerRef,
      expected_amount: intent!.amount,
      received_amount: Number(data.amount),
      reason: outcome.reason,
    });
    return new Response('ok', { status: 200 });
  }

  if (outcome.kind === 'commit') {
    const { error } = await admin.rpc('commit_paid_order', { p_order_id: outcome.orderId });
    if (error && !error.message.includes('ALREADY_PAID')) {
      console.error('commit_paid_order failed', error);
      return new Response('commit error', { status: 500 });
    }
  }

  return new Response('ok', { status: 200 });
});
```

- [ ] **Step 6: Type-check**

```bash
deno check apps/backend/supabase/functions/payment-webhook/index.ts
```

- [ ] **Step 7: Commit**

```bash
git add apps/backend/supabase/functions/payment-webhook/
git commit -m "feat(edge): add payment-webhook with HMAC verify, idempotency, dispute logging

- decideOutcome() pure function unit-tested for 6 scenarios
- Signature verified against PAYOS_CHECKSUM_KEY (rotation via _OLD env supported)
- UNIQUE (provider, provider_ref) on payment_transactions enforces idempotency
- Strict match: amount equal AND description contains intent.description
- Disputes logged for amount_mismatch, memo_not_found, duplicate_payment, late_payment
- Successful matches commit via RPC commit_paid_order"
```

---

## Task 12: Edge Function `payment-status`

**Files:**
- Create: `apps/backend/supabase/functions/payment-status/index.ts`

- [ ] **Step 1: Write the handler**

```ts
// apps/backend/supabase/functions/payment-status/index.ts
// GET /functions/v1/payment-status?order_id=...
// Auth: requires Authorization header; only the owning user (or guest with
// matching order_code cookie verified upstream) reaches this endpoint.

import { buildCorsHeaders } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET')
    return new Response('method not allowed', { status: 405, headers: cors });

  const auth = req.headers.get('Authorization');
  if (!auth) return new Response(JSON.stringify({ error: 'unauthorized' }),
    { status: 401, headers: { ...cors, 'content-type': 'application/json' } });

  const url = new URL(req.url);
  const orderId = url.searchParams.get('order_id');
  if (!orderId)
    return new Response(JSON.stringify({ error: 'missing order_id' }),
      { status: 400, headers: { ...cors, 'content-type': 'application/json' } });

  const userClient = createUserClient(auth);
  const admin = createAdminClient();
  const { data: { user } } = await userClient.auth.getUser();

  const { data: order } = await admin
    .from('orders')
    .select('id, payment_status, paid_at, expires_at, total_amount, user_id')
    .eq('id', orderId)
    .maybeSingle();

  if (!order)
    return new Response(JSON.stringify({ error: 'not found' }),
      { status: 404, headers: { ...cors, 'content-type': 'application/json' } });

  if (order.user_id && (!user || order.user_id !== user.id))
    return new Response(JSON.stringify({ error: 'forbidden' }),
      { status: 403, headers: { ...cors, 'content-type': 'application/json' } });

  return new Response(JSON.stringify({
    payment_status: order.payment_status,
    paid_at: order.paid_at,
    expires_at: order.expires_at,
    total_amount: order.total_amount,
  }), { headers: { ...cors, 'content-type': 'application/json' } });
});
```

- [ ] **Step 2: Type-check + commit**

```bash
deno check apps/backend/supabase/functions/payment-status/index.ts
git add apps/backend/supabase/functions/payment-status/index.ts
git commit -m "feat(edge): add payment-status read-only endpoint for polling fallback"
```

---

## Task 13: Edge Function `payment-cancel`

**Files:**
- Create: `apps/backend/supabase/functions/payment-cancel/index.ts`

- [ ] **Step 1: Write the handler**

```ts
// apps/backend/supabase/functions/payment-cancel/index.ts
// POST /functions/v1/payment-cancel { order_id }
// User-initiated cancel of a pending bank_transfer order.

import { buildCorsHeaders } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';
import { cancelPaymentLink } from '../_shared/payos.ts';

Deno.serve(async (req: Request) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST')
    return new Response('method not allowed', { status: 405, headers: cors });

  const auth = req.headers.get('Authorization');
  if (!auth) return new Response(JSON.stringify({ error: 'unauthorized' }),
    { status: 401, headers: { ...cors, 'content-type': 'application/json' } });

  const userClient = createUserClient(auth);
  const admin = createAdminClient();
  const { data: { user } } = await userClient.auth.getUser();

  const { order_id } = await req.json() as { order_id: string };
  if (!order_id) return new Response(JSON.stringify({ error: 'missing order_id' }),
    { status: 400, headers: { ...cors, 'content-type': 'application/json' } });

  const { data: order } = await admin
    .from('orders')
    .select('id, payment_status, user_id')
    .eq('id', order_id)
    .maybeSingle();

  if (!order) return new Response(JSON.stringify({ error: 'not found' }),
    { status: 404, headers: { ...cors, 'content-type': 'application/json' } });

  if (order.user_id && (!user || order.user_id !== user.id))
    return new Response(JSON.stringify({ error: 'forbidden' }),
      { status: 403, headers: { ...cors, 'content-type': 'application/json' } });

  if (order.payment_status !== 'pending')
    return new Response(JSON.stringify({ error: `order is ${order.payment_status}` }),
      { status: 409, headers: { ...cors, 'content-type': 'application/json' } });

  const { data: intent } = await admin
    .from('payment_intents')
    .select('provider_order_code')
    .eq('order_id', order.id)
    .maybeSingle();

  if (intent) {
    try { await cancelPaymentLink(Number(intent.provider_order_code), 'user_cancelled'); }
    catch (e) { console.warn('PayOS cancel failed (non-fatal):', (e as Error).message); }
  }

  const { error: rpcErr } = await admin.rpc('release_reserved_stock', { p_order_id: order.id });
  if (rpcErr) return new Response(JSON.stringify({ error: rpcErr.message }),
    { status: 500, headers: { ...cors, 'content-type': 'application/json' } });

  return new Response(JSON.stringify({ ok: true }),
    { headers: { ...cors, 'content-type': 'application/json' } });
});
```

- [ ] **Step 2: Type-check + commit**

```bash
deno check apps/backend/supabase/functions/payment-cancel/index.ts
git add apps/backend/supabase/functions/payment-cancel/index.ts
git commit -m "feat(edge): add payment-cancel for user-initiated VietQR cancellation"
```

---

## Task 14: Delete orphan `checkout` Edge Function

**Files:**
- Delete: `apps/backend/supabase/functions/checkout/`

- [ ] **Step 1: Verify nothing references it**

```bash
git grep -E "functions/v1/checkout|/functions/checkout" apps/web apps/mobile packages 2>&1 | head
```

Expected: no matches (only references should be in this Edge Function's own file).

- [ ] **Step 2: Delete the directory**

```bash
git rm -r apps/backend/supabase/functions/checkout
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(edge): remove orphan checkout function

Server action createOrder calls the RPC directly via Supabase RPC; this
Edge Function was an earlier prototype that no caller exercises and that
diverges from the current schema (e.g., references decrement_stock RPC
that no longer matches the new reserve flow)."
```

---

## Task 15: Deploy Edge Functions + configure secrets

- [ ] **Step 1: Set secrets**

```bash
supabase secrets set \
  PAYOS_CLIENT_ID="<from PayOS dashboard>" \
  PAYOS_API_KEY="<from PayOS dashboard>" \
  PAYOS_CHECKSUM_KEY="<from PayOS dashboard>" \
  STOREFRONT_ORIGIN="https://veganglow.vercel.app"
```

- [ ] **Step 2: Deploy functions**

```bash
supabase functions deploy payment-create
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy payment-status
supabase functions deploy payment-cancel
```

Note: `payment-webhook` MUST use `--no-verify-jwt` because PayOS doesn't send a Supabase JWT.

- [ ] **Step 3: Configure PayOS webhook URL in their dashboard**

Set webhook URL to: `https://<project-ref>.supabase.co/functions/v1/payment-webhook`

- [ ] **Step 4: Smoke test**

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/payment-webhook \
  -H 'content-type: application/json' \
  -d '{"data":{},"signature":"bogus"}'
```

Expected: HTTP 401 `invalid signature`.

- [ ] **Step 5: Commit any deploy notes**

```bash
git commit --allow-empty -m "ops(edge): deploy payment-* functions and configure PayOS webhook"
```

---

# Phase 3 — Frontend Integration

## Task 16: Update server action `createOrder`

**Files:**
- Modify: `apps/web/src/app/actions/checkout.ts`

- [ ] **Step 1: Update RPC call and return type**

Replace lines 67-132 of `apps/web/src/app/actions/checkout.ts`:

```ts
  // RPC reserves stock (does not decrement) for bank_transfer; for COD it
  // increments reserved_stock as well — the order workflow drives the actual
  // commit at delivery time. expires_at is null for COD, set for bank_transfer.
  const rpcArgs = {
    p_customer: {
      name: input.customer_name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address.trim(),
      ward: input.ward.trim(),
      ward_code: input.ward_code.trim(),
      province: input.province.trim(),
      province_code: input.province_code.trim(),
      note: input.note?.trim() ?? '',
    },
    p_items: input.items.map((i) => ({ id: i.id, quantity: i.quantity })),
    p_payment_method: input.payment_method === 'card' ? 'bank_transfer' : input.payment_method,
  };

  const { data, error } = await supabase.rpc(
    'reserve_stock_and_create_order',
    rpcArgs,
  );

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    const msg = error?.message ?? '';
    if (msg.includes('INSUFFICIENT_STOCK:')) {
      const name = msg.split('INSUFFICIENT_STOCK:')[1]?.trim() || 'Sản phẩm';
      return { success: false, error: `Hết hàng: ${name}` };
    }
    if (msg.includes('PRODUCT_INACTIVE')) return { success: false, error: 'Sản phẩm không còn được bán.' };
    if (msg.includes('PRODUCT_NOT_FOUND')) return { success: false, error: 'Không tìm thấy sản phẩm.' };
    if (msg.includes('EMPTY_CART')) return { success: false, error: 'Giỏ hàng trống.' };
    if (msg.includes('INVALID_PAYMENT_METHOD')) return { success: false, error: 'Phương thức thanh toán không hợp lệ.' };
    return { success: false, error: msg || 'Không tạo được đơn hàng.' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const { order_id, order_code, total_amount, expires_at } = row as {
    order_id: string;
    order_code: string;
    total_amount: number;
    expires_at: string | null;
  };

  revalidatePath('/orders');
  revalidatePath('/products');

  // Skip confirmation email for bank_transfer until paid (sent by webhook)
  if (input.payment_method === 'cod') {
    try {
      await sendOrderConfirmation(input.email.trim(), order_code, Number(total_amount), 'cod');
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
    }
  }

  return { success: true, order_id, order_code, expires_at };
}
```

Also update the result type at the top of the file:

```ts
type CheckoutResult =
  | { success: true; order_id: string; order_code: string; expires_at: string | null }
  | { success: false; error: string };
```

And the input accept either spelling for backward-compat with the existing form which still emits `'card'`:

```ts
type CheckoutInput = {
  items: CheckoutItem[];
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  ward: string;
  ward_code: string;
  province: string;
  province_code: string;
  payment_method: 'cod' | 'card' | 'bank_transfer';  // 'card' alias accepted; mapped to 'bank_transfer'
  note?: string;
};
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/actions/checkout.ts
git commit -m "feat(checkout): switch to reserve_stock_and_create_order RPC

createOrder now reserves stock (atomic, not decrement) and returns
expires_at. For bank_transfer the order starts in payment_status='pending'
and the confirmation email is deferred until the webhook commits."
```

---

## Task 17: Next.js API proxy routes

**Files:**
- Create: `apps/web/src/app/api/payment/create/route.ts`
- Create: `apps/web/src/app/api/payment/status/route.ts`
- Create: `apps/web/src/app/api/payment/cancel/route.ts`

- [ ] **Step 1: Write `create` route**

```ts
// apps/web/src/app/api/payment/create/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const auth = session
    ? `Bearer ${session.access_token}`
    : `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`;

  const r = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-create`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: auth },
      body: JSON.stringify(body),
    },
  );
  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}
```

- [ ] **Step 2: Write `status` route**

```ts
// apps/web/src/app/api/payment/status/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get('order_id');
  if (!orderId) return NextResponse.json({ error: 'missing order_id' }, { status: 400 });

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const auth = session
    ? `Bearer ${session.access_token}`
    : `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`;

  const r = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-status?order_id=${encodeURIComponent(orderId)}`,
    { headers: { Authorization: auth } },
  );
  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}
```

- [ ] **Step 3: Write `cancel` route**

```ts
// apps/web/src/app/api/payment/cancel/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const auth = session
    ? `Bearer ${session.access_token}`
    : `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`;

  const r = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-cancel`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: auth },
      body: JSON.stringify(body),
    },
  );
  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}
```

- [ ] **Step 4: Type-check + commit**

```bash
npm run type-check
git add apps/web/src/app/api/payment/
git commit -m "feat(api): add Next.js proxy routes for payment-* Edge Functions"
```

---

## Task 18: Client wrapper `lib/payment.ts`

**Files:**
- Create: `apps/web/src/lib/payment.ts`

- [ ] **Step 1: Write the wrapper**

```ts
// apps/web/src/lib/payment.ts
export interface PaymentIntent {
  qrCode: string;
  checkoutUrl: string;
  expiresAt: string;
  providerOrderCode: number;
}

export interface PaymentStatus {
  payment_status: 'unpaid' | 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';
  paid_at: string | null;
  expires_at: string | null;
  total_amount: number;
}

export async function createPaymentIntent(orderId: string): Promise<PaymentIntent> {
  const r = await fetch('/api/payment/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error ?? 'Không tạo được mã thanh toán.');
  }
  return r.json();
}

export async function fetchPaymentStatus(orderId: string): Promise<PaymentStatus> {
  const r = await fetch(`/api/payment/status?order_id=${encodeURIComponent(orderId)}`);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error ?? 'Không lấy được trạng thái thanh toán.');
  }
  return r.json();
}

export async function cancelPayment(orderId: string): Promise<void> {
  const r = await fetch('/api/payment/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error ?? 'Không hủy được đơn hàng.');
  }
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npm run type-check
git add apps/web/src/lib/payment.ts
git commit -m "feat(payment): add client wrapper for payment API routes"
```

---

## Task 19: Hook `usePaymentStatus`

**Files:**
- Create: `apps/web/src/hooks/usePaymentStatus.ts`

- [ ] **Step 1: Write the hook**

```ts
// apps/web/src/hooks/usePaymentStatus.ts
'use client';
import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { fetchPaymentStatus, type PaymentStatus } from '@/lib/payment';

export function usePaymentStatus(
  orderId: string,
  initial: PaymentStatus['payment_status'],
) {
  const [status, setStatus] = useState<PaymentStatus['payment_status']>(initial);
  const supabaseRef = useRef(createBrowserClient());

  // Realtime subscription
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const next = (payload.new as { payment_status?: PaymentStatus['payment_status'] }).payment_status;
          if (next) setStatus(next);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  // Polling fallback every 10s while pending
  useEffect(() => {
    if (status !== 'pending') return;
    const id = window.setInterval(async () => {
      try {
        const s = await fetchPaymentStatus(orderId);
        setStatus(s.payment_status);
      } catch {
        // swallow — realtime is primary
      }
    }, 10_000);
    return () => window.clearInterval(id);
  }, [orderId, status]);

  return status;
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npm run type-check
git add apps/web/src/hooks/usePaymentStatus.ts
git commit -m "feat(payment): add usePaymentStatus hook (realtime + polling fallback)"
```

---

## Task 20: Install `qrcode` package + write payment components

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/components/payment/PaymentCountdown.tsx`
- Create: `apps/web/src/components/payment/VietQRPanel.tsx`
- Create: `apps/web/src/components/payment/payment.module.css`

- [ ] **Step 1: Install `qrcode`**

```bash
cd apps/web && npm install qrcode && npm install -D @types/qrcode
```

- [ ] **Step 2: Write countdown component**

```tsx
// apps/web/src/components/payment/PaymentCountdown.tsx
'use client';
import { useEffect, useState } from 'react';

export function PaymentCountdown({
  expiresAt,
  onExpire,
}: {
  expiresAt: string;
  onExpire?: () => void;
}) {
  const target = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const id = window.setInterval(() => {
      const ms = Math.max(0, target - Date.now());
      setRemaining(ms);
      if (ms <= 0) {
        window.clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [target, onExpire]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
  return <span aria-live="polite">{mins}:{secs}</span>;
}
```

- [ ] **Step 3: Write VietQRPanel**

```tsx
// apps/web/src/components/payment/VietQRPanel.tsx
'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { cancelPayment } from '@/lib/payment';
import { PaymentCountdown } from './PaymentCountdown';
import styles from './payment.module.css';

export interface VietQRPanelProps {
  orderId: string;
  orderCode: string;
  amount: number;
  qrCode: string;          // raw VietQR string from PayOS
  checkoutUrl: string;     // PayOS hosted checkout URL
  expiresAt: string;
  initialStatus: 'pending' | 'paid' | 'expired' | 'failed';
}

export function VietQRPanel(props: VietQRPanelProps) {
  const status = usePaymentStatus(props.orderId, props.initialStatus);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(props.qrCode, { width: 280, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [props.qrCode]);

  if (status === 'paid') {
    return (
      <div className={styles.statePanel}>
        <CheckCircle2 size={64} className={styles.iconSuccess} />
        <h2>Thanh toán thành công!</h2>
        <p>Đơn hàng <strong>#{props.orderCode}</strong> đã được xác nhận. Chúng tôi sẽ sớm liên hệ giao hàng.</p>
        <Link href={`/orders`} className={styles.primaryBtn}>Xem đơn hàng</Link>
      </div>
    );
  }

  if (status === 'expired' || status === 'failed') {
    return (
      <div className={styles.statePanel}>
        <XCircle size={64} className={styles.iconError} />
        <h2>{status === 'expired' ? 'Mã QR đã hết hạn' : 'Thanh toán thất bại'}</h2>
        <p>Vui lòng quay lại giỏ hàng và đặt lại đơn.</p>
        <Link href="/cart" className={styles.primaryBtn}>Quay lại giỏ hàng</Link>
      </div>
    );
  }

  const handleCancel = async () => {
    if (!window.confirm('Hủy đơn hàng này? Sản phẩm sẽ được trả lại kho.')) return;
    setCancelling(true);
    try {
      await cancelPayment(props.orderId);
    } catch (e) {
      window.alert((e as Error).message);
      setCancelling(false);
    }
  };

  return (
    <div className={styles.qrPanel}>
      <div className={styles.qrHeader}>
        <h2>Quét mã VietQR để thanh toán</h2>
        <div className={styles.countdownBadge}>
          <Clock size={16} /> Hết hạn sau <PaymentCountdown expiresAt={props.expiresAt} />
        </div>
      </div>

      <div className={styles.qrFrame}>
        {qrDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={qrDataUrl} alt="VietQR" width={280} height={280} />
        ) : (
          <Loader2 className={styles.spinner} size={48} />
        )}
      </div>

      <dl className={styles.bankInfo}>
        <dt>Mã đơn hàng</dt><dd>{props.orderCode}</dd>
        <dt>Số tiền</dt><dd>{props.amount.toLocaleString('vi-VN')}đ</dd>
        <dt>Nội dung</dt><dd>{props.orderCode}</dd>
      </dl>

      <div className={styles.actions}>
        <a href={props.checkoutUrl} target="_blank" rel="noreferrer" className={styles.primaryBtn}>
          Mở trang thanh toán PayOS
        </a>
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className={styles.secondaryBtn}
        >
          {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
        </button>
      </div>

      <p className={styles.help}>
        Mã QR đã chứa sẵn số tiền và nội dung. Chỉ cần quét bằng app ngân hàng và xác nhận chuyển khoản — hệ thống sẽ tự động phát hiện thanh toán trong vài giây.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Write CSS module**

```css
/* apps/web/src/components/payment/payment.module.css */
.qrPanel {
  display: grid;
  gap: 1.5rem;
  max-width: 480px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  backdrop-filter: blur(8px);
}
.qrHeader { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; text-align: center; }
.qrHeader h2 { font-size: 1.25rem; color: var(--color-primary); margin: 0; }
.countdownBadge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; border-radius: 9999px;
  background: var(--color-warning-bg); color: var(--color-warning);
  font-size: 0.85rem; font-weight: 600;
}
.qrFrame {
  display: flex; align-items: center; justify-content: center;
  padding: 1rem; background: white; border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  min-height: 296px;
}
.bankInfo { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; margin: 0; font-size: 0.95rem; }
.bankInfo dt { color: var(--color-text-muted); }
.bankInfo dd { margin: 0; font-weight: 600; color: var(--color-text); }
.actions { display: flex; gap: 0.75rem; }
.primaryBtn, .secondaryBtn {
  flex: 1; padding: 0.75rem 1rem; border-radius: 10px;
  font-weight: 600; cursor: pointer; text-align: center; text-decoration: none;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid transparent;
}
.primaryBtn { background: var(--color-primary); color: white; }
.primaryBtn:hover { background: var(--color-primary-dark); }
.secondaryBtn { background: transparent; color: var(--color-text); border-color: var(--color-border); }
.secondaryBtn:hover { background: var(--color-surface-alt); }
.help { font-size: 0.85rem; color: var(--color-text-muted); text-align: center; margin: 0; }
.spinner { animation: spin 1s linear infinite; color: var(--color-text-muted); }
@keyframes spin { to { transform: rotate(360deg); } }

.statePanel {
  display: grid; gap: 1rem; place-items: center; text-align: center;
  padding: 3rem 2rem; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: 16px; max-width: 480px; margin: 0 auto;
}
.statePanel h2 { margin: 0; }
.iconSuccess { color: var(--color-primary); }
.iconError { color: var(--color-error, #b91c1c); }
```

- [ ] **Step 5: Type-check + commit**

```bash
npm run type-check
git add apps/web/package.json apps/web/package-lock.json apps/web/src/components/payment/
git commit -m "feat(payment): add VietQRPanel + PaymentCountdown components

- qrcode npm package generates QR image client-side from PayOS raw string
- Live status driven by usePaymentStatus hook
- Cancel button calls /api/payment/cancel
- Countdown updates every second; calls onExpire when reached"
```

---

## Task 21: New page `/checkout/[orderCode]/payment`

**Files:**
- Create: `apps/web/src/app/(storefront)/checkout/[orderCode]/payment/page.tsx`

- [ ] **Step 1: Write the page (Server Component)**

```tsx
// apps/web/src/app/(storefront)/checkout/[orderCode]/payment/page.tsx
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VietQRPanel } from '@/components/payment/VietQRPanel';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

interface Params { orderCode: string }

export default async function PaymentPage({ params }: { params: Promise<Params> }) {
  const { orderCode } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, code, total_amount, payment_method, payment_status, expires_at, user_id')
    .eq('code', orderCode)
    .maybeSingle();

  if (!order) notFound();
  if (order.payment_method !== 'bank_transfer') redirect(`/orders/${order.id}`);
  if (order.payment_status === 'paid') redirect(`/orders/${order.id}`);

  // Create-or-get the payment intent via the API proxy.
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host')!;
  const intentRes = await fetch(`${proto}://${host}/api/payment/create`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: h.get('cookie') ?? '',
    },
    body: JSON.stringify({ order_id: order.id }),
    cache: 'no-store',
  });

  if (!intentRes.ok) {
    return (
      <main style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center' }}>
        <h1>Không tạo được mã thanh toán</h1>
        <p>Vui lòng thử lại sau ít phút hoặc liên hệ hỗ trợ.</p>
      </main>
    );
  }

  const intent = await intentRes.json() as {
    qrCode: string; checkoutUrl: string; expiresAt: string;
  };

  return (
    <main style={{ padding: '3rem 1.5rem' }}>
      <VietQRPanel
        orderId={order.id}
        orderCode={order.code}
        amount={Number(order.total_amount)}
        qrCode={intent.qrCode}
        checkoutUrl={intent.checkoutUrl}
        expiresAt={intent.expiresAt}
        initialStatus={order.payment_status as 'pending' | 'paid' | 'expired' | 'failed'}
      />
    </main>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npm run type-check
git add apps/web/src/app/\(storefront\)/checkout/
git commit -m "feat(checkout): add /checkout/[orderCode]/payment route

Server Component fetches order, calls /api/payment/create (idempotent),
renders VietQRPanel with the returned QR. Refreshable: re-rendering the
page re-uses the existing payment_intent."
```

---

## Task 22: Slim down `checkout/page.tsx`

**Files:**
- Modify: `apps/web/src/app/(storefront)/checkout/page.tsx`

- [ ] **Step 1: Delete the inline QR/verification UI (lines ~169-310) and replace `handleSubmit` to redirect**

Replace the success branch (the entire `if (isSuccess)` block, lines 169-311) with this small redirect-aware success screen:

```tsx
  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={styles.successContent}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className={styles.successIcon}
          >
            <CheckCircle2 size={80} color="var(--color-primary)" />
          </motion.div>
          <h1 className={styles.successTitle}>Đặt hàng thành công!</h1>
          <p className={styles.successText}>
            Mã đơn hàng: <strong>#{orderCode}</strong>
            <br />
            Cảm ơn bạn đã tin tưởng VeganGlow.
          </p>
          <div className={styles.successActions}>
            <Link href="/orders" className={styles.submitBtn} style={{ width: 'auto', padding: '1rem 2rem' }}>
              Xem đơn hàng
            </Link>
            <Link href="/products" className={styles.cartBtn} style={{ width: 'auto', padding: '1rem 2rem' }}>
              Tiếp tục mua sắm
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }
```

Then update `handleSubmit` (lines 346-395) so that for bank_transfer it redirects to the new page instead of toggling `isSuccess`:

```tsx
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg('');

    if (!address.province_code || !address.ward_code) {
      setErrorMsg('Vui lòng chọn Tỉnh/Thành phố và Phường/Xã.');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Không có sản phẩm để thanh toán.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const paymentMethod = (formData.get('payment') as string) === 'card' ? 'bank_transfer' : 'cod';
    setLastPaymentMethod(paymentMethod === 'bank_transfer' ? 'card' : 'cod');
    setLastTotal(totalAmount);

    const result = await createOrder({
      items: items.map((it) => ({ id: it.id, quantity: it.quantity })),
      customer_name: (formData.get('customer_name') as string) || '',
      phone: (formData.get('phone') as string) || '',
      email: (formData.get('email') as string) || '',
      address: (formData.get('address') as string) || '',
      ward: address.ward,
      ward_code: address.ward_code,
      province: address.province,
      province_code: address.province_code,
      payment_method: paymentMethod,
      note: (formData.get('note') as string) || '',
    });

    setSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error);
      return;
    }

    setOrderCode(result.order_code);
    if (isBuyNowMode) clearBuyNow();
    else cart.clearCart();

    if (paymentMethod === 'bank_transfer') {
      // Hand off to dedicated payment page.
      window.location.href = `/checkout/${result.order_code}/payment`;
      return;
    }
    setIsSuccess(true);
  };
```

Also remove now-unused state: `paymentStage`, `isVerifying`, and any imports that are no longer referenced (`Image`, `ShoppingBag`, `Check` if only used in the deleted block).

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: passes (warn-and-fix any unused-import errors).

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Then in browser:
1. Add a product to cart, go to `/checkout`.
2. Choose `Thanh toán khi nhận hàng (COD)` → submit → success screen renders, no redirect.
3. Add a product, go to `/checkout`, choose `Chuyển khoản ngân hàng (VietQR)` → submit → URL changes to `/checkout/VG-xxxx/payment`, QR renders.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(storefront\)/checkout/page.tsx
git commit -m "refactor(checkout): remove fake VietQR flow; redirect to payment page

Delete the inline payment-stage UI (the setTimeout-based 'Tôi đã chuyển khoản'
fake verification, lines ~169-310 of the previous version). For bank_transfer
orders, hand off to /checkout/[orderCode]/payment which owns the real flow."
```

---

## Task 23: Remove `NEXT_PUBLIC_BANK_*` env vars

**Files:**
- Modify: `apps/web/src/app/(storefront)/checkout/page.tsx` (any remaining refs)
- Modify: `.env.example` (or the project's env reference doc)

- [ ] **Step 1: Find any remaining references**

```bash
git grep -E "NEXT_PUBLIC_BANK_(ID|ACCOUNT|NAME)" apps/ packages/ 2>&1
```

Expected: zero or only inside the file we just edited.

- [ ] **Step 2: Remove leftover refs and update env example**

If any references remain in code, delete them. In `.env.example` (or `apps/web/.env.example`), remove:

```
NEXT_PUBLIC_BANK_ID
NEXT_PUBLIC_BANK_ACCOUNT
NEXT_PUBLIC_BANK_NAME
```

And add (under a new "Payment" section):

```
# Storefront origin used by Edge Functions to build PayOS return/cancel URLs
NEXT_PUBLIC_STOREFRONT_URL=https://veganglow.vercel.app
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(env): drop NEXT_PUBLIC_BANK_* (replaced by PayOS-driven QR)

The hardcoded bank account in the client bundle is gone — QR is now
generated server-side by PayOS using merchant credentials kept in
Supabase Edge Function secrets."
```

---

# Phase 4 — Polish

## Task 24: Email template for payment success

**Files:**
- Modify: `apps/web/src/lib/email.ts`
- Modify: `apps/backend/supabase/functions/payment-webhook/index.ts`

- [ ] **Step 1: Add `sendPaymentSuccess` to email lib**

Read the current `lib/email.ts` to match its style, then append:

```ts
export async function sendPaymentSuccess(to: string, orderCode: string, totalAmount: number) {
  // Mirror the structure of sendOrderConfirmation. Subject line in Vietnamese.
  const subject = `Thanh toán thành công - Đơn hàng #${orderCode}`;
  const html = `
    <h2>Cảm ơn bạn đã thanh toán!</h2>
    <p>Đơn hàng <strong>#${orderCode}</strong> đã được xác nhận thanh toán.</p>
    <p>Tổng cộng: <strong>${totalAmount.toLocaleString('vi-VN')}đ</strong></p>
    <p>Chúng tôi sẽ chuẩn bị và giao hàng trong thời gian sớm nhất.</p>
  `;
  await sendEmail({ to, subject, html });
}
```

(`sendEmail` is the existing internal helper — keep the same wrapper used by `sendOrderConfirmation`.)

- [ ] **Step 2: Call it from the webhook**

In `apps/backend/supabase/functions/payment-webhook/index.ts`, after the successful `commit_paid_order` call, add:

```ts
    // Best-effort: send payment success email (don't block 200)
    try {
      const { data: orderRow } = await admin
        .from('orders')
        .select('email, code, total_amount')
        .eq('id', outcome.orderId)
        .maybeSingle();
      if (orderRow?.email) {
        const r = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              to: orderRow.email,
              subject: `Thanh toán thành công - Đơn hàng #${orderRow.code}`,
              html: `<h2>Cảm ơn bạn đã thanh toán!</h2><p>Đơn hàng <strong>#${orderRow.code}</strong> đã được xác nhận. Tổng tiền ${Number(orderRow.total_amount).toLocaleString('vi-VN')}đ.</p>`,
            }),
          },
        );
        if (!r.ok) console.warn('payment-success email send failed', r.status);
      }
    } catch (e) {
      console.warn('payment-success email error', (e as Error).message);
    }
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/email.ts apps/backend/supabase/functions/payment-webhook/index.ts
git commit -m "feat(payment): send 'paid' confirmation email after successful webhook"
```

---

## Task 25: Final verification & deployment checklist

- [ ] **Step 1: Lint + type-check from root**

```bash
npm run lint
npm run type-check
```

Both must pass.

- [ ] **Step 2: Run the SQL test suite**

```bash
psql "$DATABASE_URL" -f apps/backend/supabase/tests/payment_rpcs.sql
```

Expected: 4 PASS notices, no errors.

- [ ] **Step 3: Run Deno tests**

```bash
deno test apps/backend/supabase/functions/_shared/crypto.test.ts \
          apps/backend/supabase/functions/payment-webhook/index.test.ts
```

Expected: all pass.

- [ ] **Step 4: Manual end-to-end smoke against PayOS sandbox**

1. Set sandbox secrets in Supabase (`PAYOS_*` from PayOS sandbox dashboard).
2. Place a 2,000đ test order via `/checkout`, choose VietQR.
3. Verify redirect to `/checkout/<code>/payment`, QR renders.
4. Use PayOS sandbox app to simulate paying 2,000đ.
5. Watch the page: status flips to "Thanh toán thành công" within 3 seconds.
6. Verify in DB: `orders.payment_status='paid'`, `payment_transactions` row exists, `products.stock` and `reserved_stock` updated correctly.
7. Place another order, do NOT pay. Wait 16 minutes. Confirm `orders.payment_status='expired'` and `products.reserved_stock` returned to baseline.

- [ ] **Step 5: Mobile viewport check (CLAUDE.md PR checklist)**

Test the QR page at 375px width — countdown badge wraps cleanly, QR fits, buttons stack.

- [ ] **Step 6: Tag the release**

```bash
git tag -a v-vietqr-v2 -m "VietQR payment system v2 (PayOS-driven)"
```

(Push tag manually when ready.)

---

## Open items deferred from spec (Section 12)

These were flagged as Open Questions in the spec and remain TODO for follow-up tickets — **not** part of this plan:

1. Guest checkout authorization for the payment page (currently relies on server cookie/session; revisit if guest checkout volume grows).
2. Email on expiry — currently no email sent on `expired` transition. Revisit based on user-feedback signal.
3. Provisioning the PayOS production account — owner: ops/founder; not a code task.
4. Mobile (Capacitor) integration — Edge Functions already work cross-client, but no mobile-specific UI exists yet.
