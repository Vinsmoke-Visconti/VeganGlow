# Sub-project #1 — Security Hardening Design

**Status:** Approved (brainstorm)
**Date:** 2026-04-30
**Author:** Brainstorm session — VeganGlow admin overhaul
**Scope:** First of 6 sub-projects. Subsequent specs:
1. *(this)* Security Hardening
2. Product Variants & Media (pending)
3. Dashboard 2.0 (pending)
4. Order Workflow & Returns (pending)
5. CRM Deep-dive (pending)
6. Storefront Settings & Shipping (pending)

---

## 1. Goals & Success Criteria

### Goals

Hardening the admin platform against five attack categories:

1. **Account enumeration** — login responses must not reveal whether an email is staff, customer, or non-existent.
2. **Brute-force / credential stuffing** — progressive challenge prevents mass password guessing without enabling user-account DoS.
3. **Session hijacking** — admin sessions auto-expire after 30 minutes of inactivity, synchronized across tabs.
4. **Privilege escalation / IDOR** — full RLS audit closes gaps; staff cannot read or write data outside their role permissions.
5. **XSS / clickjacking / MITM** — CSP, HSTS, X-Frame-Options, secure cookie flags as defense-in-depth.

### Non-goals

- Two separate Supabase projects (rejected: overkill).
- Two separate cookie names per realm (rejected after user clarification — actual requirement is role-based access blocks, not cookie isolation).
- WAF / DDoS protection (configured at Vercel/Cloudflare layer, outside code scope).
- SSO / SAML for staff (phase 2).
- "Remember this device" trust cookie for MFA (rejected: adds attack surface for super_admin accounts).

### Success Criteria (measurable)

| # | Criterion | How measured |
|---|---|---|
| 1 | Login returns identical "Email/mật khẩu không đúng" for every failure type | Automated test: 5 failure cases (wrong password / non-existent email / staff on storefront / customer on admin / disabled account) all return same status code and body |
| 2 | Login response time stable within ±50ms | 100 requests, stddev < 50ms |
| 3 | Rate limit by IP works | 6 fails from same IP in 15 min → 6th fails with 429 + audit log |
| 4 | Admin idle 30 min → auto logout | Manual test + Jest test for `lastActivityAt` |
| 5 | Customer cannot read any `staff_profiles` row | RLS test: customer-role JWT runs `select * from staff_profiles` → 0 rows |
| 6 | Every admin mutation produces an audit log entry | After 1 product update → query `audit_logs` shows entry |
| 7 | Lighthouse security headers score ≥ 90 | Lighthouse CI |
| 8 | Super admin must enroll TOTP on first login | UI flow blocks dashboard until enrolled |
| 9 | Email-based DoS impossible — failing 5 times per email does NOT lock that user out | Test: 5 fails for `victim@x.com` → magic link sent, victim can still log in within 30s |
| 10 | Multi-tab idle: tab A idle 29 min + tab B active → tab A NOT logged out | Two-tab Playwright test |
| 11 | Middleware p95 latency ≤ 5ms | Zero DB calls for auth check (JWT decode only) |
| 12 | Super admin checkout works end-to-end | Profile auto-created via trigger; full checkout passes |
| 13 | Every `SECURITY DEFINER` function has `SET search_path = public, pg_temp` | CI check via `pg_proc.proconfig` query |
| 14 | `audit_logs.ip_hash` is HMAC-SHA256, never plain IP | Read sample row, verify field is hex hash |
| 15 | `anonymize_user_audit_logs(uid)` works | After call, audit row still exists but PII fields are NULL |
| 16 | Audit failures are not silent | DB unreachable test → console.error + Sentry capture + DLQ row |
| 17 | `details @>` queries hit GIN index | `EXPLAIN` shows `Bitmap Index Scan on audit_logs_details_gin_idx` |
| 18 | securityheaders.com score A+ for both `/admin` and storefront | Manual scan |
| 19 | Super admin without TOTP factor blocked from `/admin/dashboard` | Middleware redirects to `/admin/setup-mfa` |
| 20 | TOTP fail 3× in a row → captcha required | Test |
| 21 | Storefront retains static/ISR cache: Lighthouse Performance ≥ 90 | Hash-based CSP, no per-request mutation on storefront |
| 22 | Localhost dev not forced to HTTPS | `upgrade-insecure-requests` only emitted in `NODE_ENV=production` |
| 23 | QR code rendered server-side, no client-side library | `qrcode.react` not in `package.json` dependencies |
| 24 | Super admin cannot bypass `/admin/setup-mfa` by typing `/admin/dashboard` | Middleware AAL check redirects back |
| 25 | aal=aal1 + already-enrolled user → forced to `/admin/mfa-challenge` | Middleware test |
| 26 | Recovery flow works while user is logged out | RPC `verify_backup_code` is `SECURITY DEFINER` and callable by `anon` |

---

## 2. Architecture Overview

### High-level flow

```
                                     ┌──────────────────────────┐
                                     │ Browser (Storefront)     │
                                     │ veganglow.com/login      │
                                     └────────────┬─────────────┘
                                                  │ POST {email, password, captcha?}
                                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Server Action: loginCustomer()                                       │
│  1. Rate-limit check (Redis, 5 fails/IP/15min, captcha at tier 2)     │
│  2. signInWithPassword (server-side; cookie NOT set yet)              │
│  3. Fail → constant delay to 300ms total → "Email/mật khẩu không đúng"│
│  4. Success → role check via JWT app_metadata.staff_role:             │
│     - 'staff_*' (non-super) → signOut + generic error                 │
│     - 'super_admin' → set cookie, banner "đang ở storefront"          │
│     - 'customer' or null → set cookie, redirect /                     │
│  5. Audit: auth.login_success / auth.login_fail                       │
└──────────────────────────────────────────────────────────────────────┘

                                     ┌──────────────────────────┐
                                     │ Browser (Admin)          │
                                     │ /admin/login             │
                                     └────────────┬─────────────┘
                                                  │ POST {email, password, captcha?, totp?}
                                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Server Action: loginAdmin()                                          │
│  1. Rate-limit (3 fails/IP/15min — stricter)                          │
│  2. signInWithPassword                                                │
│  3. Fail → 300ms delay → generic error                                │
│  4. Success → role check:                                             │
│     - JWT has no staff_role or = 'customer' → signOut + generic       │
│     - is_super_admin && no MFA factor → set cookie, redirect setup    │
│     - is_super_admin && MFA factor → MFA challenge                    │
│     - regular staff → set cookie, redirect /admin                     │
│  5. Audit: auth.admin_login_success / auth.admin_login_fail           │
└──────────────────────────────────────────────────────────────────────┘
```

### Component map

| Component | File | Responsibility |
|---|---|---|
| `loginCustomer` | `apps/web/src/app/actions/auth.ts` | Storefront login with generic error |
| `loginAdmin` | `apps/web/src/app/actions/admin/auth.ts` | Admin login with generic error + MFA gate |
| `rateLimit` | `apps/web/src/lib/security/rateLimit.ts` | Redis-based rate limiter, key by IP+endpoint, with progressive challenge tiers |
| `constantDelay` | `apps/web/src/lib/security/constantDelay.ts` | Helper guaranteeing response ≥ 300ms (login) or 500ms (recovery) |
| `audit` | `apps/web/src/lib/security/auditLog.ts` | Discriminated-union typed wrapper that calls `log_admin_action_v2` RPC; routes failures to Sentry + DLQ |
| `middleware` | `apps/web/src/lib/supabase/middleware.ts` | Decodes JWT, blocks staff from purchase routes, blocks customers from admin, enforces AAL for super_admin |
| `IdleTimeoutGuard` | `apps/web/src/components/admin/IdleTimeoutGuard.tsx` | Client component tracks activity, calls `/api/auth/ping` route handler, syncs across tabs via BroadcastChannel |
| `LoginForm` | `apps/web/src/app/(auth)/admin/login/_components/LoginForm.tsx` | Form with skeleton/spinner during ≥300ms response delay |
| `MFAChallenge` | `apps/web/src/app/(auth)/admin/login/_components/MFAChallenge.tsx` | 6-digit TOTP input |
| `SetupMfaPage` | `apps/web/src/app/(auth)/admin/setup-mfa/page.tsx` | QR enrollment + backup codes |
| `RecoverPage` | `apps/web/src/app/(auth)/admin/recover/page.tsx` | Backup code recovery form |

### Data flow & key tradeoffs

- **`signInWithPassword` then `signOut` if wrong realm:** A session briefly exists server-side. Mitigation — use a "headless" Supabase client that does not set cookies in step 2; cookies set only in step 4 after all checks pass. If signOut is called, no cookie ever reaches the response.
- **Rate limit by IP only:** Bypassable via proxy. Mitigation — also rate-limit by `email-hash` (HMAC of lowercased email), but never lock the account; instead trigger captcha + magic-link path.
- **JWT custom claims for role:** Avoids RPC calls in middleware. Tradeoff — when role changes, must force-refresh user JWT. Implementation: super_admin role-change action calls `supabase.auth.admin.signOut(userId, 'global')`, forcing target user to log in again.

---

## 3. Middleware & Access Control

### Role taxonomy

```typescript
type SessionRole =
  | 'anon'           // not logged in
  | 'customer'       // in profiles, NOT in staff_profiles
  | 'staff'          // in staff_profiles, role.name ≠ 'super_admin'
  | 'super_admin';   // in staff_profiles, role.name = 'super_admin'
```

Read from JWT `app_metadata.staff_role` (set by custom access token hook).

### Access matrix

| Route | anon | customer | staff | super_admin | On violation |
|---|---|---|---|---|---|
| `/`, `/products`, `/products/[slug]`, `/blog`, `/blog/[slug]`, `/search`, `/faq`, `/contact`, `/about` | ✅ | ✅ | ✅ | ✅ | — public |
| `/login`, `/register` | ✅ | redirect `/` | redirect `/admin` | redirect `/` | redirect |
| `/cart`, `/checkout` | redirect `/login` | ✅ | redirect `/admin` | ✅ | block staff |
| `/profile`, `/profile/*` | redirect `/login` | ✅ | redirect `/admin` | ✅ | block staff |
| `/orders`, `/orders/[id]` | redirect `/login` | ✅ | redirect `/admin` | ✅ | block staff |
| `/wishlist`, `/vouchers` | redirect `/login` | ✅ | redirect `/admin` | ✅ | block staff |
| `/admin/login` | ✅ | redirect `/` | redirect `/admin` | redirect `/admin` | redirect |
| `/admin`, `/admin/*` (except `/admin/login`, `/admin/setup-mfa`, `/admin/mfa-challenge`, `/admin/recover`, `/admin/system/*`) | redirect `/admin/login` | redirect `/` | ✅ permission-filtered | ✅ | block customer |
| `/admin/system/*` (super-admin-only settings + audit log UI) | redirect `/admin/login` | redirect `/` | redirect `/admin` | ✅ | block staff |

### Defense-in-depth (3 layers for cart/checkout/orders)

| Layer | Location | Logic |
|---|---|---|
| 1 — Middleware | `middleware.ts` | If `pathname ∈ blockedForStaff` && `staff_role !== 'super_admin'` && `staff_role` set → redirect `/admin` |
| 2 — Server Component | each page top | Re-check; on violation call `notFound()` (avoids leaking layout) |
| 3 — Server Action | `placeOrder`, `addToCart`, `applyVoucher` | `throw` if staff non-super_admin |

### AAL enforcement (super_admin)

```typescript
if (pathname.startsWith('/admin') && !EXEMPT_PATHS.has(pathname)) {
  const claims = decodeJwt(session.access_token);
  const aal: 'aal1' | 'aal2' = claims.aal;
  const isSuperAdmin = claims.app_metadata?.is_super_admin === true;

  if (isSuperAdmin) {
    const hasVerifiedTotp = await getMfaStatusCached(user.id);
    if (!hasVerifiedTotp && pathname !== '/admin/setup-mfa') {
      return NextResponse.redirect(new URL('/admin/setup-mfa', request.url));
    }
    if (hasVerifiedTotp && aal === 'aal1' && pathname !== '/admin/mfa-challenge') {
      return NextResponse.redirect(new URL('/admin/mfa-challenge', request.url));
    }
  }
}

const EXEMPT_PATHS = new Set([
  '/admin/login', '/admin/setup-mfa', '/admin/mfa-challenge', '/admin/recover',
]);
```

`getMfaStatusCached` reads a signed JWT cookie `mfa_factor_status` (TTL 5 min). On enroll/disable, the action invalidates the cookie. Cache miss → `supabase.auth.mfa.listFactors()` (rare path).

### Idle timeout (30 minutes)

- Client `<IdleTimeoutGuard>` listens to `mousemove`, `keydown`, `click`, `scroll`, throttled 5s.
- On activity: `localStorage.setItem('admin_last_activity_local', now)` + `BroadcastChannel('admin-activity').postMessage({ type: 'activity', at: now })` + `fetch('/api/auth/ping', { method: 'POST' })` (only if `now - lastPing > 60_000`).
- Other tabs receive broadcast, reset their idle timers. **Modal warning fires only when ALL tabs idle.**
- Server route handler `app/api/auth/ping/route.ts` updates cookie `admin_last_activity` (HttpOnly, Secure, SameSite=Strict, Path=/admin, maxAge=3600).
- Middleware reads `admin_last_activity`; if `now - value > 30min` → signOut + redirect `/admin/login?reason=idle` + audit log `auth.idle_logout`.
- Two minutes before expiry: client modal "Phiên sắp hết hạn" with "Tiếp tục" (calls ping) and "Đăng xuất".

### Rate limit tiers

| Key | Tier | Trigger | Action |
|---|---|---|---|
| `login:ip:<ip>` | 1 | 3 fails / 15 min | Require Cloudflare Turnstile next attempt |
| `login:ip:<ip>` | 2 | 5 fails / 15 min | Captcha mandatory + 1s delay |
| `login:email:<email-hash>` | 3 | 5 fails / 15 min on same email (any IP) | Send email magic-link recovery to that email; **do NOT lock the account** |
| `login:ip:<ip>` | 4 | 30 fails / 1 hour | Hard 429 for this IP |
| `admin_login:ip:<ip>` | — | 3 fails / 15 min | Stricter — captcha at tier 1 |
| `recover_backup:ip:<ip>` | — | 3 fails / 15 min | Hard 429 |
| `pingActivity:ip:<ip>` | — | 100 / 1 min | Drop request silently (no error) |

Storage: Redis (`apps/web/src/lib/redis.ts` already present). Email is hashed SHA-256 before storage.

---

## 4. RLS Audit

### Table classification

#### Tier 1 — Admin-only (highly sensitive)

| Table | Expected policies |
|---|---|
| `staff_profiles` | SELECT: super_admin or self; UPDATE: super_admin or self limited fields; DELETE: super_admin |
| `staff_invitations` | All: super_admin only |
| `audit_logs` | INSERT: only via `log_admin_action_v2` RPC (SECURITY DEFINER); SELECT: super_admin or actor=self; UPDATE/DELETE: nobody |
| `audit_logs_dlq` | All: super_admin |
| `system_settings` | SELECT: staff; UPDATE: super_admin |
| `roles`, `permissions`, `role_permissions` | SELECT: staff; mutation: super_admin |
| `payment_transactions` | SELECT: order owner or staff with `orders:read`; INSERT/UPDATE: webhook (service_role) only |
| `checkout_idempotency_keys` | All: via RPC only; deny direct PostgREST |
| `user_banks` | All: self only |
| `contact_messages` | INSERT: anon; SELECT/UPDATE: staff `customer_support:*` |
| `private.otp_verifications` | Schema isolation — already correct |
| `auth_backup_codes` | SELECT: self; INSERT/UPDATE via SECURITY DEFINER RPC |

#### Tier 2 — Owner + admin (PII)

| Table | Expected policies |
|---|---|
| `profiles` | SELECT: self + staff; UPDATE: self only; INSERT: trigger; DELETE: super_admin |
| `addresses` | All: self (`auth.uid() = user_id`); SELECT also staff support |
| `orders` | SELECT: self + staff `orders:read`; UPDATE: only via RPC for status changes by staff `orders:update` |
| `order_items` | SELECT: order owner + staff; INSERT: only via checkout RPC |
| `user_vouchers` | SELECT: self + staff; INSERT: only via RPC `apply_voucher` or admin grant |
| `user_settings` | All: self only |
| `notifications` | SELECT/UPDATE: self; INSERT: service_role or admin |
| `favorites` | All: self only |

#### Tier 3 — Public read + admin write

| Table | Expected policies |
|---|---|
| `products` | SELECT: anon if `is_active = true`; mutation: staff `products:*` |
| `categories` | SELECT: anon if `is_active`; mutation: staff |
| `vouchers` | SELECT: anon (public fields); mutation: staff `marketing:*` |
| `banners` | SELECT: anon if `is_active`; mutation: staff |
| `flash_sales` | SELECT: anon if currently active window; mutation: staff |
| `team_members`, `testimonials`, `blog_posts`, `faqs` | SELECT: anon if `is_active`; mutation: staff `content:*` |
| `reviews` | SELECT: anon; INSERT: customer who purchased (verified via orders); UPDATE: author + staff; DELETE: staff |

### Top-10 RLS gaps to verify

1. `USING (true)` policies (over-broad).
2. Missing INSERT policies (default = allow if RLS on but no FOR INSERT).
3. SELECT bypass via VIEW (views inherit RLS only when created `SECURITY INVOKER`).
4. `SECURITY DEFINER` functions without `SET search_path = public, pg_temp`.
5. Excessive GRANT to `anon` role (`GRANT ALL` instead of `GRANT SELECT`).
6. Policies using `auth.email()` instead of `auth.uid()`.
7. `audit_logs` allowing UPDATE — must be immutable.
8. service_role usage from browser code.
9. Storage bucket policies — `00014_admin_storage_buckets.sql` needs audit on `storage.objects`.
10. `payment_transactions` allowing user UPDATE of status (could self-mark paid).

### Audit method

1. **Auto-discovery script** runs at CI time:
   ```sql
   SELECT schemaname, tablename, policyname, cmd, qual, with_check
   FROM pg_policies WHERE schemaname IN ('public', 'storage')
   ORDER BY tablename;
   ```
2. **Coverage check** — RLS-enabled tables with zero policies for any command flag CI.
3. **Test matrix** — 4 actor types × ~30 tables × 4 commands = ~480 cases. Generate via SQL script. Run subset (50 critical) on every PR; full suite nightly.
4. **Penetration test** — login as customer, attempt `SELECT * FROM staff_profiles`, `UPDATE orders SET status = 'delivered' WHERE id = <other_user_order>`, etc. All must fail.

### Deliverables

- Migration `00021_security_hardening_rls_audit.sql` — idempotent fixes.
- pgTAP test files in `apps/backend/supabase/tests/rls/<table>.test.sql`.
- `docs/security/rls-matrix.md` — expected matrix as living docs.
- CI step `npm run db:test:rls` — fails PR on regression.

---

## 5. Audit Log Expansion + UI

### 5.1 Events to log (expanded set)

#### Auth & security
| Action | When | Severity |
|---|---|---|
| `auth.login_success` | Login OK (storefront or admin) | info |
| `auth.login_fail` | Login fail (after rate-limit pass) | warn |
| `auth.rate_limited` | IP/email hit tier 2+ | warn |
| `auth.captcha_challenged` | Captcha required | info |
| `auth.magic_link_sent` | Tier 3 bypass magic link sent | warn |
| `auth.logout` | Voluntary logout | info |
| `auth.idle_logout` | Auto-logout via 30 min idle | info |
| `auth.session_revoked` | Force-revoke on role change | warn |
| `auth.mfa_enrolled` | Super admin enrolled TOTP | info |
| `auth.mfa_failed` | TOTP wrong | warn |
| `auth.cross_realm_blocked` | Staff tried storefront / customer tried admin | warn |
| `auth.backup_code_used` | Recovery via backup code | warn |
| `gdpr.user_anonymized` | `anonymize_user_audit_logs` called | critical |

#### RBAC
`rbac.role_assigned`, `rbac.role_revoked`, `rbac.permission_changed`, `rbac.staff_invited`, `rbac.staff_disabled`.

#### Data mutations (extended)
`product.{created,updated,archived,restored,price_changed,stock_changed}`,
`category.{created,updated,deleted}`,
`order.{status_changed,refunded,cancelled,shipped,note_added}`,
`voucher.{created,updated,disabled,used}`,
`banner.{created,updated,activated,deactivated}`,
`customer.{banned,unbanned,note_added,address_edited_by_staff}`,
`setting.updated`.

### 5.2 Schema changes

```sql
-- migration: 00022_audit_log_expansion.sql
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warn', 'error', 'critical')),
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS session_id text;

-- IP becomes a hash (HMAC-SHA256) — never plain
ALTER TABLE public.audit_logs RENAME COLUMN ip_address TO ip_hash;

CREATE INDEX IF NOT EXISTS audit_logs_action_idx
  ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_severity_idx
  ON public.audit_logs(severity, created_at DESC)
  WHERE severity IN ('warn', 'error', 'critical');
CREATE INDEX IF NOT EXISTS audit_logs_details_gin_idx
  ON public.audit_logs USING GIN (details jsonb_path_ops);

-- Immutable: nobody (including super_admin) can UPDATE/DELETE
DROP POLICY IF EXISTS audit_logs_no_update ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_no_delete ON public.audit_logs;
CREATE POLICY audit_logs_no_update ON public.audit_logs FOR UPDATE USING (false);
CREATE POLICY audit_logs_no_delete ON public.audit_logs FOR DELETE USING (false);

-- Reading: super_admin sees all, others see only their own
DROP POLICY IF EXISTS audit_logs_select_super_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_super_admin ON public.audit_logs
  FOR SELECT USING (public.is_super_admin());
DROP POLICY IF EXISTS audit_logs_select_self ON public.audit_logs;
CREATE POLICY audit_logs_select_self ON public.audit_logs
  FOR SELECT USING (actor_id = auth.uid());

-- Dead-letter queue for failed writes
CREATE TABLE IF NOT EXISTS public.audit_logs_dlq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload jsonb NOT NULL,
  error_msg text,
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  replayed_at timestamptz
);
ALTER TABLE public.audit_logs_dlq ENABLE ROW LEVEL SECURITY;
CREATE POLICY dlq_super_admin_all ON public.audit_logs_dlq FOR ALL USING (public.is_super_admin());

-- GDPR-compatible anonymization (preserve WHAT, remove WHO)
CREATE OR REPLACE FUNCTION public.anonymize_user_audit_logs(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  UPDATE public.audit_logs
  SET ip_hash = NULL,
      user_agent = NULL,
      session_id = NULL,
      details = COALESCE(details, '{}'::jsonb) - 'email' - 'phone' - 'address' - 'full_name'
  WHERE actor_id = target_user_id;

  INSERT INTO public.audit_logs (actor_id, action, severity, entity, entity_id, summary)
  VALUES (auth.uid(), 'gdpr.user_anonymized', 'critical', 'user', target_user_id::text,
          'Anonymized audit logs for user ' || target_user_id);
END $$;

REVOKE ALL ON FUNCTION public.anonymize_user_audit_logs(uuid) FROM PUBLIC, anon, authenticated;
```

### 5.3 Helper API

```typescript
// apps/web/src/lib/security/auditLog.ts
type AuditEvent =
  | { action: 'auth.login_success'; severity: 'info'; details: { method: 'password' | 'magic_link' | 'oauth' } }
  | { action: 'auth.login_fail'; severity: 'warn'; details: { reason: 'wrong_password' | 'cross_realm' | 'rate_limited' } }
  | { action: 'product.created'; severity: 'info'; entity: 'product'; entity_id: string; summary: string }
  | { action: 'order.refunded'; severity: 'warn'; entity: 'order'; entity_id: string; details: { amount: number; reason: string } }
  // ...full discriminated union
  ;

export async function audit(event: AuditEvent, ctx?: AuditContext): Promise<void> {
  // ip_hash = HMAC-SHA256(ctx.ip ?? '', AUDIT_IP_PEPPER)
  try {
    await supabase.rpc('log_admin_action_v2', { /* ... */ });
  } catch (err) {
    console.error('[AUDIT_FAILURE]', { event, err });
    Sentry.captureException(err, { level: 'error', tags: { component: 'audit_log' } });
    await writeToDeadLetter({ payload: event, error_msg: serializeError(err) });
    if (++auditFailureCounter > 10) {
      Sentry.captureMessage('Audit log failing repeatedly', 'fatal');
    }
  }
}
```

Discriminated union forces TypeScript to validate `details` shape per action at compile time.

### 5.4 Audit Log UI (super_admin only)

**Route:** `/admin/system/audit-logs` — already gated by `/admin/system/*` middleware.

**Layout:**
- Header with date range picker + filter chips: Action, Actor, Severity, Search.
- Critical-events alert banner: "12 critical events in last 24h → View".
- Table: Time | Actor | Action | Entity | Severity (with color badge).
- Row click → slide-over panel showing full `details` JSON, request_id, session_id, user_agent, ip_hash (raw hash for ops correlation).
- Quick presets: "Sự cố bảo mật", "Thay đổi quyền", "Hoạt động hôm nay của tôi", "Refund/Cancel".
- Export CSV of current filter (max 10k rows).

### 5.5 Retention

- Hot: 90 days (indexed, queried directly).
- Cold: > 90 days — partition by month (`PARTITION BY RANGE (created_at)`); drop partitions older than 12 months after archiving to Supabase Storage `audit-archive/YYYY-MM.jsonl.gz` via cron edge function.
- **Phase 1 ships hot + manual archive only.** Partitioning is phase 2.

### 5.6 Performance

- Synchronous insert (~5ms). Acceptable. Async-ification is phase 2.
- Failure isolated: `audit()` never throws into the calling business logic; only logs to console + Sentry + DLQ.

---

## 6. Security Headers + 2FA

### 6.1 CSP strategy (split: nonce for /admin, hash for storefront)

```javascript
// apps/web/next.config.mjs (excerpt)
const isProd = process.env.NODE_ENV === 'production';

const baseHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
];
if (isProd) {
  baseHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}

// Storefront: hash + strict-dynamic — compatible with SSG/ISR
const storefrontCSP = [
  "default-src 'self'",
  `script-src 'self' 'strict-dynamic' ${getNextBootstrapHash()} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

// Admin: nonce-based — admin layout is force-dynamic anyway
const adminCSPTemplate = (nonce) => [
  "default-src 'self'",
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

export default {
  async headers() {
    return [
      {
        source: '/((?!admin).*)',
        headers: [...baseHeaders, { key: 'Content-Security-Policy', value: storefrontCSP }],
      },
      // /admin CSP injected by middleware (per-request nonce)
    ];
  },
};
```

`getNextBootstrapHash()` reads the inline-bootstrap script hash from the build manifest. Computed at build time.

**Middleware nonce injection (`/admin` only):**

```typescript
const nonce = crypto.randomBytes(16).toString('base64');
supabaseResponse.headers.set('Content-Security-Policy', adminCSPTemplate(nonce));
supabaseResponse.headers.set('x-nonce', nonce);
// In layout: const nonce = (await headers()).get('x-nonce'); pass to <Script nonce={nonce}>
```

**Cookie flags:**
- All Supabase auth cookies: `HttpOnly`, `Secure` (prod only), `SameSite=Lax`.
- `admin_last_activity`: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/admin`.
- `mfa_factor_status`: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/admin`, signed JWT TTL 5 min.

### 6.2 2FA (TOTP) for super_admin

Uses Supabase Auth MFA (built-in).

#### Enrollment flow

1. Super admin logs in via password.
2. Server detects `is_super_admin && no verified TOTP factor`.
3. Middleware redirects → `/admin/setup-mfa`.
4. UI calls server action `enrollMfa()` which calls `supabase.auth.mfa.enroll({ factorType: 'totp' })` and renders QR as **server-generated SVG** (using `qrcode` Node library). No client-side QR library needed.
5. User scans with Google Authenticator / 1Password.
6. User submits 6-digit code → server calls `mfa.verify()`.
7. Server generates 8 backup codes; UI shows them once (download .txt + copy).
8. bcrypt hash of each backup code stored in `auth_backup_codes` table.
9. Audit `auth.mfa_enrolled`.
10. Redirect to `/admin`.

#### Login challenge

1. Super admin enters email + password at `/admin/login`.
2. Server `signInWithPassword` succeeds → check `user.factors`.
3. Has TOTP, not yet aal2 → return `{ needsMFA: true, factorId }`.
4. UI shows 6-digit input (auto-focus, paste-friendly).
5. User submits code → `mfa.challengeAndVerify()`.
6. Pass → set cookie, audit `auth.mfa_success`, redirect `/admin`.
7. 3 fails in row → captcha required + audit `auth.mfa_failed` (warn).

#### Backup code recovery

User is **not logged in** — `auth.uid()` is NULL — RLS blocks. Use SECURITY DEFINER RPC:

```sql
-- migration: 00023_mfa_backup_codes.sql
CREATE OR REPLACE FUNCTION public.verify_backup_code(p_email text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_code_record record;
  v_match boolean := false;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(p_email);
  IF v_user_id IS NULL THEN
    PERFORM pg_sleep(0.3);
    RETURN jsonb_build_object('ok', false);
  END IF;

  FOR v_code_record IN
    SELECT id, code_hash FROM public.auth_backup_codes
    WHERE user_id = v_user_id AND used_at IS NULL
  LOOP
    IF crypt(p_code, v_code_record.code_hash) = v_code_record.code_hash THEN
      v_match := true;
      UPDATE public.auth_backup_codes SET used_at = now() WHERE id = v_code_record.id;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_match THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, severity, summary)
  VALUES (v_user_id, 'auth.backup_code_used', 'warn', 'Backup code consumed for MFA recovery');

  RETURN jsonb_build_object('ok', true, 'user_id', v_user_id);
END $$;

REVOKE ALL ON FUNCTION public.verify_backup_code(text, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_backup_code(text, text) TO anon;
```

Server action `recoverWithBackupCode`:
1. Rate-limit `recover_backup:ip` 3 attempts / 15 min (very strict).
2. Constant delay 500ms.
3. Call RPC; on success send magic link with `emailRedirectTo=/admin/setup-mfa?reenroll=true`.
4. User clicks link → forced to re-enroll TOTP, replacing the old factor.

### 6.3 Edge cases

- Lost backup codes + lost phone: another super_admin disables MFA via admin UI (audit logged). Sole super_admin → emergency manual SQL via Supabase dashboard.
- TOTP time drift: ±1 step (90s window) accepted by Supabase default.
- Super_admin onboarding: trigger sets `enforce_mfa = true`; UI blocks until enrolled.

---

## 7. Migration & Rollout + Testing Strategy

### 7.1 Migration order (atomic, idempotent)

```
00021_security_hardening_rls_audit.sql
00022_audit_log_expansion.sql
00023_mfa_backup_codes.sql
00024_jwt_custom_claims_hook.sql
00025_ensure_profile_on_signup.sql
00026_search_path_audit.sql      -- ALTER existing SECURITY DEFINER funcs to add search_path
```

Rules:
- Use `IF NOT EXISTS` / `IF EXISTS`.
- `DROP POLICY IF EXISTS … CREATE POLICY …` for idempotency.
- `ON CONFLICT DO NOTHING` for seeds.
- Each migration has a header comment: purpose + reversal steps.
- Never drop a column in active use — rename or dual-write.

### 7.2 Rollout phases (zero downtime)

| Phase | Action | Rollback? | Risk |
|---|---|---|---|
| 0 | DB backup + snapshot | ✅ | nil |
| 1 | Push migrations 00021–00026 (only ADD, no DROP) | ✅ | low |
| 2 | Enable `custom_access_token_hook` in Supabase config; reduce JWT TTL to 1h to force refresh | ✅ disable hook | medium |
| 3 | Deploy middleware reading JWT claims (with fallback to `is_staff()` RPC during transition) | ✅ revert deploy | low |
| 4 | Deploy rate-limit + login generic error + Cloudflare Turnstile (test mode 24h, then prod) | ✅ flag | low |
| 5 | Deploy idle timeout — flag-gated, dev test 30min, then enable for all admin | ✅ flag | low |
| 6 | Deploy MFA enrollment. Email super_admins: "Setup TOTP within 7 days, then enforced." After 7 days flip `FEATURE_MFA_ENFORCED=true` | ✅ flag | medium |
| 7 | Deploy CSP in **report-only** mode for 1 week, collect violations via Sentry, fix, then enforce | ✅ revert | high |
| 8 | Deploy `audit()` v2 helper, replace legacy `log_admin_action` callsites; backfill `severity = 'info'` for existing rows | ✅ keep RPC v1 | low |
| 9 | Deploy 00021 (RLS fixes). pgTAP must pass on branch DB first | ⚠️ needs backup | high |
| 10 | Cleanup: drop fallback code in middleware, remove unused legacy policies | ❌ | low |

Feature flags via env: `FEATURE_MFA_ENFORCED`, `FEATURE_TURNSTILE_ENABLED`, `FEATURE_IDLE_TIMEOUT_ENABLED`, `FEATURE_CSP_ENFORCE`, `FEATURE_USE_JWT_CLAIMS`.

### 7.3 Testing strategy

#### Unit (Vitest)
- `rateLimit` 100% — every tier
- `constantDelay` 100% — stddev < 50ms over 100 calls
- `auditLog` 100% — happy + DLQ on failure
- `IdleTimeoutGuard` 90% — fake-timer 30min idle, BroadcastChannel sync
- Login server actions 100% — 5 failure cases produce identical generic error

#### Integration (Playwright + Supabase test DB)
- Login flow storefront + admin happy path + 5 failure cases.
- Customer hits `/admin` → redirect `/`.
- Staff hits `/cart` → redirect `/admin`.
- Super admin enroll MFA → setup → challenge → dashboard.
- Idle 30 min → auto-logout.
- Multi-tab activity sync via BroadcastChannel.
- Backup code recovery → magic link.

#### RLS (pgTAP)
Files in `apps/backend/supabase/tests/rls/<table>.test.sql`. ~15 critical tables × ~16 cases (4 actors × 4 commands) = ~240 tests. CI: `npm run db:test:rls`.

#### Security tests
| Test | Method | Pass criteria |
|---|---|---|
| Account enumeration | 5 login attempts with varying email types | Identical status + body, response stddev < 50ms |
| Brute force | 30 fails from same IP / 1h | 6+ → captcha, 30+ → 429 |
| Email DoS | 10 fails on victim email from 10 IPs | Victim receives magic link, NOT locked |
| XSS via product description | Inject `<script>` | CSP blocks, audit log records violation |
| AAL bypass | Super admin password-only, types `/admin/dashboard` | Redirect to `/admin/mfa-challenge` |
| Search-path attack | Query `pg_proc` for SECURITY DEFINER without search_path | 0 rows in public schema |
| RLS via PostgREST | Customer JWT GETs `/rest/v1/staff_profiles` | 200 with 0 rows |

#### Manual smoke (per CLAUDE.md — 375px viewport)
- Admin login form responsive
- MFA challenge input mobile-friendly
- Audit log table horizontal scroll OK
- Idle timeout modal renders correctly

### 7.4 Rollback plan

- **CSP enforce breaks site:** flip `FEATURE_CSP_ENFORCE=false` → instant restore. Analyze Sentry, fix, re-enable.
- **RLS locks legitimate user:** identify policy via Postgres logs; `DROP POLICY <name> ON <table>` via Supabase SQL editor; recreate looser; re-test.
- **MFA locks super admin:** SQL emergency: `UPDATE auth.mfa_factors SET status = 'unverified' WHERE user_id = '<id>';` or flip `FEATURE_MFA_ENFORCED=false`.

### 7.5 Definition of Done

- [ ] All 26 success criteria pass automated checks.
- [ ] CI: `npm run lint`, `type-check`, `test`, `db:test:rls`, `db:test:security-definer` all green.
- [ ] `/review` (code review skill) returns no blockers.
- [ ] `/security-review` returns no high/critical findings.
- [ ] Manual QA on 375px mobile viewport passes.
- [ ] Rollback plan tested once on staging.
- [ ] `docs/security/rls-matrix.md` and `docs/security/threat-model.md` committed.
- [ ] All audit-logged code paths produce DB entries on smoke test.

---

## Appendix A — Key files modified or added

```
NEW    apps/web/src/lib/security/rateLimit.ts
NEW    apps/web/src/lib/security/constantDelay.ts
NEW    apps/web/src/lib/security/auditLog.ts
NEW    apps/web/src/lib/security/ipHash.ts
NEW    apps/web/src/components/admin/IdleTimeoutGuard.tsx
NEW    apps/web/src/app/api/auth/ping/route.ts
NEW    apps/web/src/app/(auth)/admin/setup-mfa/page.tsx
NEW    apps/web/src/app/(auth)/admin/mfa-challenge/page.tsx
NEW    apps/web/src/app/(auth)/admin/recover/page.tsx
NEW    apps/web/src/app/actions/admin/auth.ts
NEW    apps/web/src/app/actions/admin/mfa.ts
NEW    apps/web/src/app/actions/admin/recover.ts
NEW    apps/web/src/app/(backoffice)/admin/system/audit-logs/page.tsx
MOD    apps/web/src/app/actions/auth.ts             (loginCustomer rewrite)
MOD    apps/web/src/lib/supabase/middleware.ts      (JWT claims, AAL, idle, role-aware blocks)
MOD    apps/web/next.config.mjs                     (CSP split, security headers)
NEW    apps/backend/supabase/migrations/00021_security_hardening_rls_audit.sql
NEW    apps/backend/supabase/migrations/00022_audit_log_expansion.sql
NEW    apps/backend/supabase/migrations/00023_mfa_backup_codes.sql
NEW    apps/backend/supabase/migrations/00024_jwt_custom_claims_hook.sql
NEW    apps/backend/supabase/migrations/00025_ensure_profile_on_signup.sql
NEW    apps/backend/supabase/migrations/00026_search_path_audit.sql
NEW    apps/backend/supabase/tests/rls/*.test.sql
NEW    docs/security/rls-matrix.md
NEW    docs/security/threat-model.md
```

## Appendix B — Open questions parked for implementation phase

- Exact bundle-hash extraction script for `getNextBootstrapHash()` — need to inspect Next 16 build manifest format.
- Whether `pg_cron` schedule for cold-archive of audit logs lives in DB or as Supabase Edge Function.
- Final list of `details` schema variants in audit `AuditEvent` discriminated union — to be enumerated during implementation as each call site is updated.
- Exact retention period for `audit_logs_dlq` rows (after replay) — default to 90 days unless legal advises otherwise.
