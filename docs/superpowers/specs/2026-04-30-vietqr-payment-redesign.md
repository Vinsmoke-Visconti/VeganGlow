# VietQR Payment System Redesign

**Date:** 2026-04-30
**Status:** Draft — pending user review
**Author:** Claude (brainstorming session with binmin81@gmail.com)

---

## 1. Goals & Non-goals

### Goals

- Replace the current fake "Tôi đã chuyển khoản" flow (a `setTimeout` simulation in [checkout/page.tsx:174-182](../../../apps/web/src/app/(storefront)/checkout/page.tsx#L174-L182)) with a real PayOS integration that auto-confirms payments via webhook.
- Stop holding stock for orders that never get paid (current `decrement_stock_and_create_order` decrements immediately, regardless of payment).
- Add a proper payment state model (`payment_status`) separate from order workflow status.
- Make every webhook event idempotent and signature-verified.
- Auto-expire pending VietQR orders after 15 minutes and release reserved stock.
- Real-time UI feedback (Supabase Realtime) with polling fallback (10s).

### Non-goals

- Supporting multiple payment providers in v1 (PayOS only; design leaves room for adding `provider` enum values).
- International cards / e-wallets (Momo, ZaloPay, VNPay) — out of scope.
- Partial refunds / split payments.
- Strong-reservation across browser tabs (one user can still create multiple pending orders for the same SKU; reserved_stock counts correctly).

---

## 2. Decisions & Rationale

| Decision | Choice | Why |
|---|---|---|
| Provider | **PayOS** | SDK rõ ràng, free tier đủ dùng, webhook ký HMAC SHA256 sẵn, tài liệu tiếng Việt. |
| Stock model | **Reserve 15 min, release on expiry** | Tránh oversell trong flash sale, tránh giam kho khi user bỏ ngang. |
| Frontend feedback | **Supabase Realtime + 10s polling fallback** | Realtime cho UX < 1s; polling cứu trường hợp WebSocket disconnect. |
| Amount mismatch | **Strict match** (amount + memo) | QR pre-fills amount + memo trong app ngân hàng nên xác suất sai gần 0; sai lệch → dispute, không tự duyệt. |
| Backend layer | **Supabase Edge Functions (Deno)** | Tuân theo CLAUDE.md ("Complex Logic: Use Supabase Edge Functions for checkout, inventory, and emails"); service_role không leak ra Next.js; mobile app tái sử dụng được. |

---

## 3. Architecture

```
┌─────────────────┐                        ┌──────────────────────────┐
│ Storefront      │  1) submit checkout    │ Server Action            │
│ (Next.js client)│ ─────────────────────► │ createOrder()            │
│                 │                        │  • validate input        │
│  ┌───────────┐  │                        │  • RPC reserve+create    │
│  │QR screen  │◄─┐                        │  • return order_code     │
│  │+ countdown│  │ 6) realtime UPDATE     └────────────┬─────────────┘
│  └───────────┘  │  on orders row                      │ if bank_transfer
└────────┬────────┘                                     ▼
         │                                     ┌────────────────────┐
         │ 7) polling /payment-status (10s)    │ Edge Fn:           │
         └────────────────────────────────────►│ payment-create     │
                                               │  • call PayOS API  │
                                               │  • insert intent   │
                                               │  • return qr+url   │
                                               └────────┬───────────┘
                                                        │ writes (service_role)
                                                        ▼
┌──────────────────────────────────────────────────────────────────┐
│  Supabase Postgres                                               │
│  ┌──────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│  │ orders   │  │ payment_intents │  │ payment_transactions   │  │
│  │ +payment │  │  (1-1, qr,      │  │  (every webhook event, │  │
│  │ _status  │  │   expires_at)   │  │   unique provider_ref) │  │
│  │ +paid_at │  │                 │  │                        │  │
│  │ +expires │  │                 │  │  payment_disputes      │  │
│  │ _at      │  │                 │  │  (mismatch / late)     │  │
│  └──────────┘  └─────────────────┘  └────────────────────────┘  │
└────────────────────────▲─────────────────────────▲───────────────┘
                         │                         │
              ┌──────────┴───────────┐    ┌────────┴─────────┐
              │ Edge Fn:             │    │ Edge Fn:         │
              │ payment-webhook      │    │ payment-status   │
              │  • verify HMAC       │    │  (polling API)   │
              │  • dedup by ref      │    └──────────────────┘
              │  • strict amount+memo│
              │  • RPC commit        │
              └──────────┬───────────┘
                         │
                         ▲
              ┌──────────┴───────────┐
              │ PayOS                │
              │ (NAPAS bank network) │
              └──────────────────────┘

┌────────────────────────────┐
│ pg_cron: every 1 min       │ ──► RPC release_reserved_stock(order_id)
│ expire_pending_payments    │     for orders past expires_at
└────────────────────────────┘
```

### Components added

| Path | Type | Purpose |
|---|---|---|
| `apps/backend/supabase/functions/payment-create/index.ts` | Edge Function | Create PayOS payment link, persist intent |
| `apps/backend/supabase/functions/payment-webhook/index.ts` | Edge Function (public) | Receive PayOS webhook, verify HMAC, commit |
| `apps/backend/supabase/functions/payment-status/index.ts` | Edge Function | Read-only status endpoint for polling |
| `apps/backend/supabase/migrations/00017_payment_system.sql` | Migration | New tables, columns, RPCs |
| `apps/backend/supabase/migrations/00018_payment_cron.sql` | Migration | pg_cron job for expiry |
| `apps/web/src/app/(storefront)/checkout/[orderCode]/payment/page.tsx` | Page route | Dedicated VietQR screen, refreshable |
| `apps/web/src/components/payment/VietQRPanel.tsx` | Component | QR + countdown UI |
| `apps/web/src/components/payment/usePaymentStatus.ts` | Hook | Realtime subscription + polling fallback |
| `apps/web/src/lib/payment.ts` | Lib | Client wrapper for Edge Function calls |
| `apps/web/src/app/api/payment/status/route.ts` | API route | Thin Next.js proxy to `payment-status` |

### Components removed / modified

- `apps/backend/supabase/functions/checkout/index.ts` — orphan code (server action uses RPC directly). **Delete** to avoid confusion.
- `apps/web/src/app/(storefront)/checkout/page.tsx` — slim down: remove the inline QR + fake verification (lines ~169-310). After successful `createOrder`, redirect to `/checkout/[orderCode]/payment` for bank_transfer; keep simple success screen for COD.
- `apps/web/src/app/actions/checkout.ts` — switch RPC name from `decrement_stock_and_create_order` to `reserve_stock_and_create_order`. Map new error codes.
- Remove `NEXT_PUBLIC_BANK_*` env vars (they expose hardcoded bank account in client bundle).

---

## 4. Data Model

Migration `00017_payment_system.sql` extends `orders`, adds 3 new tables, adds `reserved_stock` column to `products`, replaces the checkout RPC.

### `orders` (extend)

```sql
alter table public.orders
  drop constraint orders_payment_method_check,
  add constraint orders_payment_method_check
    check (payment_method in ('cod', 'bank_transfer'));
-- Note: existing rows with payment_method='card' need a one-shot UPDATE to 'bank_transfer'
-- (included in the same migration, before the constraint swap).

alter table public.orders
  add column payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'expired', 'failed', 'refunded')),
  add column paid_at timestamptz,
  add column expires_at timestamptz;

create index orders_payment_status_idx on public.orders(payment_status);
create index orders_expires_idx on public.orders(expires_at)
  where payment_status = 'pending';
```

State semantics:
- `unpaid` — COD default; admin marks paid manually after delivery.
- `pending` — bank_transfer awaiting customer transfer; stock is reserved.
- `paid` — webhook confirmed; stock committed; order moves to `confirmed` workflow status.
- `expired` — past `expires_at`; reserved stock released; order workflow status `cancelled`.
- `failed` — PayOS returned cancellation/failure event for this intent.
- `refunded` — admin-only terminal state.

### `products` (extend)

```sql
alter table public.products
  add column reserved_stock integer not null default 0
    check (reserved_stock >= 0 and reserved_stock <= stock);
```

Customer-facing available quantity = `stock - reserved_stock`. Update product reads (admin + storefront) to use this.

### `payment_intents` (new)

```sql
create table public.payment_intents (
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
```

`provider_order_code` is the int64 PayOS requires; we generate it as `floor(random() * 9e15)` and rely on the UNIQUE constraint to retry on collision (probability ~0).

### `payment_transactions` (new — audit + idempotency)

```sql
create table public.payment_transactions (
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
```

The UNIQUE `(provider, provider_ref)` is the canonical idempotency key. Manual admin confirmations use `provider_ref = 'manual:<admin_user_id>:<order_id>'`.

### `payment_disputes` (new)

```sql
create table public.payment_disputes (
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
```

### RLS

```sql
alter table public.payment_intents enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_disputes enable row level security;

-- No policies → effectively service_role only.
-- Customers read their payment status only via the payment-status Edge Function
-- (which checks auth.uid() against orders.user_id before returning).
```

### RPCs (new)

- `reserve_stock_and_create_order(p_customer jsonb, p_items jsonb, p_payment_method text)` returns `(order_id, order_code, total_amount, expires_at)`.
  - Replaces `decrement_stock_and_create_order`.
  - For `cod`: behaves like before but uses `reserved_stock` accounting.
  - For `bank_transfer`: increments `reserved_stock` (not `stock`); sets `orders.payment_status = 'pending'`; sets `orders.expires_at = now() + interval '15 minutes'`.
  - Validates `stock - reserved_stock >= quantity` instead of `stock >= quantity`.

- `commit_paid_order(p_order_id uuid)` returns void.
  - Called from webhook handler (service_role).
  - Asserts `payment_status = 'pending'`; raises `ALREADY_PAID` or `ORDER_EXPIRED` otherwise.
  - Decrements `products.stock`, decrements `products.reserved_stock` (both by same quantity).
  - Sets `payment_status = 'paid'`, `paid_at = now()`, workflow `status = 'confirmed'`.
  - Updates `payment_intents.status = 'paid'`.

- `release_reserved_stock(p_order_id uuid)` returns void.
  - Called from cron + manual cancel.
  - Asserts `payment_status = 'pending'`.
  - Decrements `products.reserved_stock` by order_items quantities.
  - Sets `payment_status = 'expired'`, workflow `status = 'cancelled'`.
  - Updates `payment_intents.status = 'expired'`.

All three RPCs use `for update` row locks on `products` in deterministic order to prevent deadlocks.

---

## 5. Payment Flow (state machine)

### Happy path

1. **User submits checkout** → server action `createOrder` validates input, calls `reserve_stock_and_create_order`. Returns `{ order_id, order_code, expires_at }`.
2. **Frontend redirects** to `/checkout/<order_code>/payment` (route owns the QR session; refreshable).
3. **VietQR page loads** → calls `POST /functions/v1/payment-create { order_id }`.
4. **payment-create Edge Function**:
   - Verifies caller has access (RLS via auth header).
   - Calls PayOS `createPaymentLink` with `{ orderCode, amount, description: order_code, expiredAt }`.
   - Inserts `payment_intents`. Returns `{ qrCode, checkoutUrl, expiresAt }`.
5. **Frontend renders QR** + countdown to `expiresAt`. Subscribes Realtime to `orders WHERE id = order_id`. Starts 10s polling fallback.
6. **User pays** via bank app (amount and memo are pre-filled by the QR — they don't type anything).
7. **PayOS sends webhook** → `payment-webhook` Edge Function:
   - Verifies HMAC SHA256 of raw body against `PAYOS_CHECKSUM_KEY`. Reject 401 on mismatch.
   - Idempotency lookup: `SELECT 1 FROM payment_transactions WHERE provider='payos' AND provider_ref=?`. If exists → return 200 immediately.
   - Lookup `payment_intents` by `provider_order_code`. If missing → log dispute `intent_not_found`, return 200.
   - **Strict match:** `amount === intent.amount` AND `description.includes(intent.description)`. If mismatch → log dispute, insert transaction with status='disputed', return 200.
   - Insert `payment_transactions`. UNIQUE constraint catches concurrent retries (return 200 on `23505`).
   - Call `commit_paid_order(order_id)`. If raises `ALREADY_PAID` → log + 200 (race won by other invocation).
   - Best-effort: send "đã thanh toán" email.
   - Return 200.
8. **Realtime broadcasts** `orders.UPDATE` → frontend hook flips state to `paid` → UI shows "Thành công".

### Expiry path

- Every 60s, `pg_cron` calls `expire_pending_payments()`.
- Function selects up to 200 orders with `payment_status='pending' AND expires_at < now()` using `for update skip locked`.
- For each, calls `release_reserved_stock(order_id)`.
- Frontend Realtime sees the UPDATE → shows "Hết hạn, vui lòng đặt lại".

### Manual cancel

- Frontend "Hủy" button → `POST /functions/v1/payment-cancel { order_id }`.
- Function (auth required, must own order) checks `payment_status='pending'` and calls `release_reserved_stock`.

### Admin manual confirm

- Admin UI button → server action calls `commit_paid_order` directly with synthetic `provider_ref = 'manual:<admin_user_id>:<order_id>'` written to `payment_transactions`.

---

## 6. Webhook Handler (security pseudocode)

```ts
// apps/backend/supabase/functions/payment-webhook/index.ts
import { createAdminClient } from '../_shared/supabase.ts';
import { hmacSHA256, constantTimeEqual } from '../_shared/crypto.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  // 1. Verify signature on RAW body
  const signature = req.headers.get('x-payos-signature') ?? '';
  const rawBody = await req.text();
  const expected = await hmacSHA256(Deno.env.get('PAYOS_CHECKSUM_KEY')!, rawBody);
  if (!constantTimeEqual(signature, expected)) {
    return new Response('invalid signature', { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const data = payload.data ?? {};
  const providerRef = String(data.reference ?? data.id ?? '');
  if (!providerRef) return new Response('missing ref', { status: 400 });

  const admin = createAdminClient();

  // 2. Idempotency
  const { data: dup } = await admin
    .from('payment_transactions')
    .select('id')
    .eq('provider', 'payos')
    .eq('provider_ref', providerRef)
    .maybeSingle();
  if (dup) return new Response('ok', { status: 200 });

  // 3. Lookup intent
  const { data: intent } = await admin
    .from('payment_intents')
    .select('order_id, amount, description, status, expires_at')
    .eq('provider_order_code', data.orderCode)
    .single();

  if (!intent) {
    await admin.from('payment_transactions').insert({
      provider: 'payos', provider_ref: providerRef,
      amount: data.amount, status: 'orphan',
      raw_payload: payload, signature,
    });
    return new Response('intent not found', { status: 200 });
  }

  // 4. Strict match + state guards
  const amountOK = Number(data.amount) === Number(intent.amount);
  const memoOK = String(data.description ?? '').includes(intent.description);
  const expired = intent.status === 'expired' || new Date(intent.expires_at) < new Date();
  const alreadyPaid = intent.status === 'paid';

  if (!amountOK || !memoOK || expired || alreadyPaid) {
    await admin.from('payment_disputes').insert({
      order_id: intent.order_id,
      provider_ref: providerRef,
      expected_amount: intent.amount,
      received_amount: data.amount,
      reason: !amountOK ? 'amount_mismatch'
            : !memoOK ? 'memo_not_found'
            : alreadyPaid ? 'duplicate_payment'
            : 'late_payment',
    });
    await admin.from('payment_transactions').insert({
      order_id: intent.order_id, provider: 'payos', provider_ref: providerRef,
      amount: data.amount, status: 'disputed',
      raw_payload: payload, signature,
    });
    return new Response('logged for review', { status: 200 });
  }

  // 5. Insert transaction (UNIQUE = double dedup)
  const { error: txErr } = await admin.from('payment_transactions').insert({
    order_id: intent.order_id, provider: 'payos', provider_ref: providerRef,
    amount: data.amount, status: 'paid',
    raw_payload: payload, signature,
  });
  if (txErr && txErr.code !== '23505') {
    return new Response('db error', { status: 500 });  // PayOS will retry
  }

  // 6. Commit (RPC handles its own state guards)
  const { error: commitErr } = await admin.rpc('commit_paid_order', {
    p_order_id: intent.order_id,
  });
  if (commitErr && !commitErr.message.includes('ALREADY_PAID')) {
    return new Response('commit failed', { status: 500 });
  }

  // 7. Side effects (best-effort)
  try { await sendPaymentSuccessEmail(intent.order_id); } catch {}

  return new Response('ok', { status: 200 });
});
```

**Secrets in Supabase Edge Functions:**
- `PAYOS_CLIENT_ID`
- `PAYOS_API_KEY`
- `PAYOS_CHECKSUM_KEY`
- (Optional) `PAYOS_CHECKSUM_KEY_OLD` for rolling key rotation; verify against both.

---

## 7. Reserve Expiry (pg_cron)

```sql
-- 00018_payment_cron.sql
create extension if not exists pg_cron;

create or replace function public.expire_pending_payments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_id uuid;
begin
  for v_id in
    select id from public.orders
    where payment_status = 'pending' and expires_at < now()
    order by expires_at
    for update skip locked
    limit 200
  loop
    perform public.release_reserved_stock(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

select cron.schedule(
  'expire-pending-payments',
  '* * * * *',
  $$select public.expire_pending_payments()$$
);
```

---

## 8. Frontend Integration

### File structure

```
apps/web/src/
├── app/(storefront)/
│   ├── checkout/
│   │   ├── page.tsx                     -- form only (~250 lines, was 599)
│   │   ├── checkout.module.css
│   │   └── [orderCode]/payment/
│   │       ├── page.tsx                 -- VietQR screen route (refreshable)
│   │       └── payment.module.css
│   └── api/payment/
│       ├── status/route.ts              -- proxy to payment-status Edge Fn
│       ├── create/route.ts              -- proxy to payment-create
│       └── cancel/route.ts              -- proxy to payment-cancel
├── components/payment/
│   ├── VietQRPanel.tsx                  -- QR image + bank info + countdown
│   ├── PaymentCountdown.tsx
│   └── PaymentStatusBanner.tsx
├── lib/payment.ts                       -- client wrappers
└── hooks/usePaymentStatus.ts            -- Realtime + polling
```

### `usePaymentStatus` hook

```ts
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'failed';

export function usePaymentStatus(orderId: string, initial: PaymentStatus) {
  const [status, setStatus] = useState<PaymentStatus>(initial);
  const supabase = createBrowserClient();

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`order:${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'orders', filter: `id=eq.${orderId}`,
      }, (payload) => {
        const next = payload.new.payment_status as PaymentStatus;
        setStatus(next);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId, supabase]);

  // Polling fallback
  useEffect(() => {
    if (status !== 'pending') return;
    const id = setInterval(async () => {
      const r = await fetch(`/api/payment/status?order_id=${orderId}`);
      if (!r.ok) return;
      const d = await r.json();
      setStatus(d.payment_status);
    }, 10000);
    return () => clearInterval(id);
  }, [orderId, status]);

  return status;
}
```

### Page route `/checkout/[orderCode]/payment`

- Server Component fetches order + intent via Supabase server client (RLS-checked: must be the order owner OR session order_code stored at checkout time).
- Renders `<VietQRPanel order={...} intent={...} />` (Client Component) with initial status snapshot.
- VietQRPanel handles realtime, countdown, and the success/expired transitions.
- For guest checkout (no auth), we store the `order_code` in an httpOnly cookie at `createOrder` time, and the server component reads that cookie to authorize access.

---

## 9. Error Handling & Edge Cases

| Case | Handling |
|---|---|
| User refresh QR page | Server Component re-reads from DB; QR + countdown reconstructed; no state lost. |
| Network drop mid-session | Realtime auto-reconnects; polling 10s catches missed updates. |
| Two concurrent webhook events | UNIQUE `(provider, provider_ref)` + `for update skip locked` in RPC → only one commits. |
| Payment arrives after expiry | Webhook still verifies signature; intent.status='expired' → dispute `late_payment`; admin reconciles. |
| User pays twice (double pay) | Second webhook: order already `paid` → dispute `duplicate_payment`; admin processes refund. |
| PayOS API timeout when creating intent | Edge Fn returns 502; frontend retries up to 2× with backoff. If still failing: order rolled back via `release_reserved_stock`. |
| Stock runs out at reserve time | RPC raises `INSUFFICIENT_STOCK:<name>` → server action returns user-friendly error. |
| Admin manual confirm | Synthetic `provider_ref = 'manual:<admin_id>:<order_id>'`; RPC `commit_paid_order` reused. |
| PayOS rotates checksum key | `PAYOS_CHECKSUM_KEY_OLD` env supports rolling rotation; webhook verifies against both. |
| Webhook verification fails | Return 401 → PayOS treats as failed delivery; logs only signature, not body (avoid storing forged data). |

---

## 10. Testing Strategy

### Unit tests (Edge Functions, with Deno test runner)

- HMAC verification: golden vectors from PayOS docs (positive + negative).
- Strict match logic: matrix of {amount equal/diff, memo present/absent/partial}.
- Idempotency: feed same payload twice → second returns 200 without DB writes.

### Integration tests (Supabase local + Vitest)

- `reserve_stock_and_create_order` then `release_reserved_stock`: stock counters return to baseline.
- 10 concurrent reserves on a 5-stock product → exactly 5 succeed, 5 raise `INSUFFICIENT_STOCK`.
- Webhook called 3× with same `provider_ref`: exactly one commit, exactly one transaction row.
- Mismatch amount → dispute row created, `payment_transactions.status='disputed'`, order remains `pending`.
- `expire_pending_payments` cron: orders past `expires_at` flip to `expired`, reserved_stock returns to 0.

### E2E tests (Playwright, against local supabase + mock PayOS)

- COD checkout works end-to-end (regression).
- VietQR happy path: form → QR page → mock webhook fires → UI shows success.
- VietQR expiry: form → QR page → fast-forward time → UI shows "hết hạn".

### Manual verification

- PayOS sandbox: create real payment link, scan QR with PayOS sandbox app, confirm webhook delivers and order flips to paid.

---

## 11. Migration & Rollout Plan

1. **Migration 00017** — schema changes only (no behavior change yet); run on staging.
2. **Backfill** — set all existing `orders.payment_method='card'` to `'bank_transfer'`; existing orders all get `payment_status='unpaid'` (default) which is fine — old orders treated as completed manually.
3. **Migration 00018** — pg_cron job (idempotent, no rows yet).
4. **Deploy Edge Functions** — `payment-create`, `payment-webhook`, `payment-status`, `payment-cancel`.
5. **Configure PayOS dashboard** — webhook URL pointing at `payment-webhook` endpoint.
6. **Deploy frontend** behind a feature flag `NEXT_PUBLIC_VIETQR_V2_ENABLED`. With flag off, behavior is unchanged.
7. **Smoke test** with a 1,000đ test order against sandbox.
8. **Flip flag on**; monitor `payment_disputes` table for first 48h.

---

## 12. Open Questions (for user review)

1. **Guest checkout authorization** for the `/checkout/[orderCode]/payment` route — is httpOnly cookie storing `order_code` acceptable, or do we want to require auth before VietQR? (Currently the codebase allows guest checkout.)
2. **Email on expiry** — send "đơn hàng đã hết hạn" email or skip? (Currently spec says no email on expiry.)
3. **PayOS sandbox account** — who provisions it? (Need credentials before E2E tests can pass.)
4. **Mobile app (Capacitor)** — out of scope for this spec, or should the same Edge Functions cover it now? (Architecture supports it; just confirming scope.)

---
