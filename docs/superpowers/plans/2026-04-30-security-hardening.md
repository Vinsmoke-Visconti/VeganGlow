# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the VeganGlow admin platform: generic-error login, JWT-based middleware, idle timeout, MFA, audit log v2, RLS audit, split CSP — meeting all 26 success criteria from the design spec.

**Architecture:** Single Supabase project with shared auth cookie. Role separation enforced via JWT custom claims (Postgres `custom_access_token_hook`) read by Next.js middleware (zero DB calls). Defense-in-depth: middleware → Server Component → Server Action. MFA built on Supabase Auth's TOTP factor; backup-code recovery via `SECURITY DEFINER` RPC. CSP split: nonce for `/admin` (already force-dynamic), hash + `'strict-dynamic'` for storefront (preserves SSG cache).

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + Auth + RLS + MFA), Upstash Redis, Vitest, Playwright, pgTAP, Cloudflare Turnstile, `qrcode` (server-side SVG), `jose` (JWT decode), `@sentry/nextjs`.

**Spec:** [`docs/superpowers/specs/2026-04-30-security-hardening-design.md`](../specs/2026-04-30-security-hardening-design.md)

---

## Conventions

- All commands run from repo root (`VeganGlow/`).
- Test files alongside source: `foo.ts` → `foo.test.ts`.
- Migration filenames continue numeric sequence: next is `00021_*`.
- pgTAP tests: `apps/backend/supabase/tests/rls/<table>.test.sql`, run via `pg_prove`.
- Every task ends with a single commit using conventional-commit format. **Never include `Co-Authored-By` trailer.**
- Run after every task: `npm run lint && npm run type-check` from root before commit.
- Feature flags via env vars: `FEATURE_MFA_ENFORCED`, `FEATURE_TURNSTILE_ENABLED`, `FEATURE_IDLE_TIMEOUT_ENABLED`, `FEATURE_CSP_ENFORCE`, `FEATURE_USE_JWT_CLAIMS`. Default all to `false` until explicitly flipped.

---

## File Structure (will be created)

```
apps/backend/supabase/migrations/
  00021_security_hardening_rls_audit.sql
  00022_audit_log_expansion.sql
  00023_mfa_backup_codes.sql
  00024_jwt_custom_claims_hook.sql
  00025_ensure_profile_on_signup.sql
  00026_search_path_audit.sql

apps/backend/supabase/tests/rls/
  staff_profiles.test.sql
  audit_logs.test.sql
  payment_transactions.test.sql
  system_settings.test.sql
  orders.test.sql
  user_banks.test.sql
  audit_logs_immutable.test.sql
  search_path_compliance.test.sql

apps/web/src/lib/security/
  rateLimit.ts            + .test.ts
  constantDelay.ts        + .test.ts
  ipHash.ts               + .test.ts
  auditLog.ts             + .test.ts
  jwtClaims.ts            + .test.ts
  turnstile.ts            + .test.ts

apps/web/src/components/admin/
  IdleTimeoutGuard.tsx    + .test.tsx

apps/web/src/app/api/auth/ping/route.ts

apps/web/src/app/(auth)/admin/setup-mfa/page.tsx
apps/web/src/app/(auth)/admin/mfa-challenge/page.tsx
apps/web/src/app/(auth)/admin/recover/page.tsx

apps/web/src/app/actions/admin/auth.ts          (loginAdmin)
apps/web/src/app/actions/admin/mfa.ts           (enroll, verify, disable)
apps/web/src/app/actions/admin/recover.ts       (recoverWithBackupCode)

apps/web/src/app/(backoffice)/admin/system/audit-logs/page.tsx
apps/web/src/app/(backoffice)/admin/system/audit-logs/_components/AuditLogTable.tsx
apps/web/src/app/(backoffice)/admin/system/audit-logs/_components/AuditLogFilters.tsx
apps/web/src/app/(backoffice)/admin/system/audit-logs/_components/AuditLogDetailPanel.tsx

apps/web/e2e/security/
  account-enumeration.spec.ts
  brute-force.spec.ts
  email-dos.spec.ts
  aal-bypass.spec.ts
  multi-tab-idle.spec.ts

docs/security/
  rls-matrix.md
  threat-model.md

apps/web/src/app/actions/auth.ts                (MOD: rewrite loginCustomer)
apps/web/src/lib/supabase/middleware.ts         (MOD: JWT decode, AAL, idle, blocks)
apps/web/next.config.mjs                        (MOD: CSP split + headers)
apps/web/package.json                           (MOD: add deps)
apps/web/vitest.config.ts                       (NEW)
apps/web/playwright.config.ts                   (NEW)
package.json                                    (MOD: root scripts for db:test:rls etc.)
apps/backend/supabase/config.toml               (MOD: enable custom_access_token hook)
```

---

## Task 0: Tooling & Dependencies

**Goal:** Install test runners and security libs so subsequent TDD steps work.

**Files:**
- Modify: `apps/web/package.json`, `package.json` (root)
- Create: `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`, `apps/web/test-setup.ts`

- [ ] **Step 1: Add dependencies**

```bash
cd apps/web && npm install --save \
  jose qrcode @sentry/nextjs && \
  npm install --save-dev \
  vitest @vitest/ui @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom @playwright/test @types/qrcode
cd ../..
```

- [ ] **Step 2: Add scripts to `apps/web/package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint src",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 3: Add root scripts to `package.json`**

```json
{
  "scripts": {
    "test": "npm run test --workspace=apps/web",
    "test:e2e": "npm run test:e2e --workspace=apps/web",
    "db:test:rls": "pg_prove --ext .sql apps/backend/supabase/tests/rls/",
    "db:test:security-definer": "psql $DATABASE_URL -f apps/backend/supabase/tests/rls/search_path_compliance.test.sql"
  }
}
```

- [ ] **Step 4: Create `apps/web/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 5: Create `apps/web/test-setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('@/lib/redis', () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
}));
```

- [ ] **Step 6: Create `apps/web/playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```

- [ ] **Step 7: Verify**

```bash
npm run test --workspace=apps/web -- --run --passWithNoTests
```

Expected: `No test files found, exiting with code 0` (or `--passWithNoTests` makes it return 0).

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/playwright.config.ts apps/web/test-setup.ts package.json package-lock.json
git commit -m "chore(security): add vitest, playwright, jose, qrcode, sentry deps for hardening work"
```

---

## Task 1: Migration 00021 — RLS Audit Fixes (skeleton)

**Goal:** Idempotent migration that closes Top-10 RLS gaps. We'll layer table-specific fixes in subsequent tasks; this lays the framework.

**Files:**
- Create: `apps/backend/supabase/migrations/00021_security_hardening_rls_audit.sql`

- [ ] **Step 1: Write migration**

```sql
-- 00021_security_hardening_rls_audit.sql
-- Purpose: Close RLS gaps identified in security-hardening design §4.
-- Reversal: DROP POLICY for each policy created here; this file is idempotent
-- so re-running has no effect.

BEGIN;

-- 1. payment_transactions: prevent users from updating status to mark themselves paid
DROP POLICY IF EXISTS payment_tx_user_update ON public.payment_transactions;
DROP POLICY IF EXISTS payment_tx_no_user_update ON public.payment_transactions;
CREATE POLICY payment_tx_no_user_update ON public.payment_transactions
  FOR UPDATE USING (false);

-- SELECT: order owner OR staff with orders:read
DROP POLICY IF EXISTS payment_tx_select ON public.payment_transactions;
CREATE POLICY payment_tx_select ON public.payment_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
    OR public.has_permission('orders', 'read')
  );

-- 2. checkout_idempotency_keys: deny direct SELECT/INSERT — only RPC access
DROP POLICY IF EXISTS idempotency_no_direct ON public.checkout_idempotency_keys;
CREATE POLICY idempotency_no_direct ON public.checkout_idempotency_keys
  FOR ALL USING (false);

-- 3. user_banks: self only
ALTER TABLE public.user_banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_banks_self_all ON public.user_banks;
CREATE POLICY user_banks_self_all ON public.user_banks
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. system_settings: read by staff, write by super_admin
DROP POLICY IF EXISTS system_settings_read ON public.system_settings;
DROP POLICY IF EXISTS system_settings_write ON public.system_settings;
CREATE POLICY system_settings_read ON public.system_settings
  FOR SELECT USING (public.is_staff());
CREATE POLICY system_settings_write ON public.system_settings
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 5. roles, permissions, role_permissions: read by staff, write by super_admin
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['roles', 'permissions', 'role_permissions']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_read ON public.%I FOR SELECT USING (public.is_staff())', t, t);
    EXECUTE format('CREATE POLICY %I_write ON public.%I FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin())', t, t);
  END LOOP;
END $$;

-- 6. staff_profiles: super_admin or self read; super_admin write
DROP POLICY IF EXISTS staff_profiles_select ON public.staff_profiles;
DROP POLICY IF EXISTS staff_profiles_write ON public.staff_profiles;
CREATE POLICY staff_profiles_select ON public.staff_profiles
  FOR SELECT USING (id = auth.uid() OR public.is_super_admin());
CREATE POLICY staff_profiles_write ON public.staff_profiles
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 7. staff_invitations: super_admin only
DROP POLICY IF EXISTS staff_invitations_all ON public.staff_invitations;
CREATE POLICY staff_invitations_all ON public.staff_invitations
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

COMMIT;
```

- [ ] **Step 2: Apply locally**

```bash
npm run db:reset
```

Expected: all migrations apply, no error.

- [ ] **Step 3: Verify policies exist**

```bash
npx supabase db execute "SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('payment_transactions','user_banks','system_settings','staff_profiles','staff_invitations') ORDER BY tablename;"
```

Expected: at least one policy per table.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/supabase/migrations/00021_security_hardening_rls_audit.sql
git commit -m "feat(security): close top-10 RLS gaps in critical tables"
```

---

## Task 2: Migration 00022 — Audit Log v2 Schema

**Files:**
- Create: `apps/backend/supabase/migrations/00022_audit_log_expansion.sql`

- [ ] **Step 1: Write migration**

```sql
-- 00022_audit_log_expansion.sql
-- Purpose: Audit log v2 — severity, ip_hash (PII-safe), GIN index, DLQ table,
--          GDPR anonymize function, immutable policies.

BEGIN;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warn', 'error', 'critical')),
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS session_id text;

-- Rename ip_address → ip_hash (only if not already renamed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'audit_logs'
             AND column_name = 'ip_address')
  THEN
    ALTER TABLE public.audit_logs RENAME COLUMN ip_address TO ip_hash;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS audit_logs_action_idx
  ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_severity_idx
  ON public.audit_logs(severity, created_at DESC)
  WHERE severity IN ('warn', 'error', 'critical');
CREATE INDEX IF NOT EXISTS audit_logs_details_gin_idx
  ON public.audit_logs USING GIN (details jsonb_path_ops);

-- Immutable: nobody can UPDATE/DELETE
DROP POLICY IF EXISTS audit_logs_no_update ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_no_delete ON public.audit_logs;
CREATE POLICY audit_logs_no_update ON public.audit_logs FOR UPDATE USING (false);
CREATE POLICY audit_logs_no_delete ON public.audit_logs FOR DELETE USING (false);

-- Read: super_admin sees all; others see their own
DROP POLICY IF EXISTS audit_logs_select_super_admin ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_self ON public.audit_logs;
CREATE POLICY audit_logs_select_super_admin ON public.audit_logs
  FOR SELECT USING (public.is_super_admin());
CREATE POLICY audit_logs_select_self ON public.audit_logs
  FOR SELECT USING (actor_id = auth.uid());

-- DLQ
CREATE TABLE IF NOT EXISTS public.audit_logs_dlq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload jsonb NOT NULL,
  error_msg text,
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  replayed_at timestamptz
);
ALTER TABLE public.audit_logs_dlq ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dlq_super_admin_all ON public.audit_logs_dlq;
CREATE POLICY dlq_super_admin_all ON public.audit_logs_dlq
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- log_admin_action_v2: typed RPC
DROP FUNCTION IF EXISTS public.log_admin_action_v2(text, text, text, text, text, jsonb, text, text, text);
CREATE OR REPLACE FUNCTION public.log_admin_action_v2(
  p_action text,
  p_severity text DEFAULT 'info',
  p_entity text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_summary text DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_ip_hash text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_request_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.audit_logs
    (actor_id, action, severity, entity, entity_id, summary, details,
     ip_hash, user_agent, request_id, resource_type)
  VALUES
    (auth.uid(), p_action, p_severity, p_entity, p_entity_id, p_summary, p_details,
     p_ip_hash, p_user_agent, p_request_id, COALESCE(p_entity, 'unknown'))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.log_admin_action_v2 FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_admin_action_v2 TO authenticated, anon;

-- GDPR anonymize
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

  INSERT INTO public.audit_logs (actor_id, action, severity, entity, entity_id, summary, resource_type)
  VALUES (auth.uid(), 'gdpr.user_anonymized', 'critical', 'user', target_user_id::text,
          'Anonymized audit logs for user ' || target_user_id, 'user');
END $$;

REVOKE ALL ON FUNCTION public.anonymize_user_audit_logs(uuid) FROM PUBLIC, anon, authenticated;

COMMIT;
```

- [ ] **Step 2: Apply + verify**

```bash
npm run db:reset
npx supabase db execute "SELECT column_name FROM information_schema.columns WHERE table_name='audit_logs' AND column_name IN ('severity','ip_hash','request_id');"
```

Expected: 3 rows.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/supabase/migrations/00022_audit_log_expansion.sql
git commit -m "feat(security): audit log v2 with severity, ip_hash, GIN, DLQ, GDPR anonymize"
```

---

## Task 3: Migration 00023 — MFA Backup Codes

**Files:**
- Create: `apps/backend/supabase/migrations/00023_mfa_backup_codes.sql`

- [ ] **Step 1: Write migration**

```sql
-- 00023_mfa_backup_codes.sql
-- Purpose: Backup-code table + verify_backup_code RPC for MFA recovery flow.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.auth_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS backup_codes_user_idx
  ON public.auth_backup_codes(user_id) WHERE used_at IS NULL;
ALTER TABLE public.auth_backup_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS backup_codes_self_select ON public.auth_backup_codes;
CREATE POLICY backup_codes_self_select ON public.auth_backup_codes
  FOR SELECT USING (user_id = auth.uid());

-- Insert/update only via SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.create_backup_codes(p_codes text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE c text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Rotate: invalidate prior codes
  UPDATE public.auth_backup_codes
  SET used_at = now()
  WHERE user_id = auth.uid() AND used_at IS NULL;

  FOREACH c IN ARRAY p_codes
  LOOP
    INSERT INTO public.auth_backup_codes (user_id, code_hash)
    VALUES (auth.uid(), crypt(c, gen_salt('bf', 10)));
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.create_backup_codes(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_backup_codes(text[]) TO authenticated;

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

  INSERT INTO public.audit_logs (actor_id, action, severity, summary, resource_type)
  VALUES (v_user_id, 'auth.backup_code_used', 'warn',
          'Backup code consumed for MFA recovery', 'auth');

  RETURN jsonb_build_object('ok', true, 'user_id', v_user_id);
END $$;

REVOKE ALL ON FUNCTION public.verify_backup_code(text, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_backup_code(text, text) TO anon;

COMMIT;
```

- [ ] **Step 2: Apply + verify**

```bash
npm run db:reset
npx supabase db execute "SELECT count(*) FROM pg_proc WHERE proname IN ('create_backup_codes','verify_backup_code');"
```

Expected: `2`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/supabase/migrations/00023_mfa_backup_codes.sql
git commit -m "feat(security): mfa backup codes table + verify_backup_code RPC for recovery"
```

---

## Task 4: Migration 00024 — JWT Custom Claims Hook

**Files:**
- Create: `apps/backend/supabase/migrations/00024_jwt_custom_claims_hook.sql`
- Modify: `apps/backend/supabase/config.toml`

- [ ] **Step 1: Write hook function**

```sql
-- 00024_jwt_custom_claims_hook.sql
-- Purpose: Inject staff_role + permissions + is_super_admin into JWT app_metadata
--          so middleware can authorize without DB roundtrip.

BEGIN;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := (event->>'user_id')::uuid;
  v_role text;
  v_perms text[];
  v_claims jsonb;
BEGIN
  SELECT r.name INTO v_role
  FROM public.staff_profiles sp
  JOIN public.roles r ON r.id = sp.role_id
  WHERE sp.id = v_user_id;

  IF v_role IS NOT NULL THEN
    SELECT array_agg(p.module || ':' || p.action) INTO v_perms
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.staff_profiles sp ON sp.role_id = rp.role_id
    WHERE sp.id = v_user_id;
  END IF;

  v_claims := COALESCE(event->'claims', '{}'::jsonb);

  IF (v_claims->'app_metadata') IS NULL THEN
    v_claims := jsonb_set(v_claims, '{app_metadata}', '{}'::jsonb);
  END IF;

  v_claims := jsonb_set(v_claims, '{app_metadata,staff_role}',
                        to_jsonb(COALESCE(v_role, 'customer')));
  v_claims := jsonb_set(v_claims, '{app_metadata,permissions}',
                        to_jsonb(COALESCE(v_perms, ARRAY[]::text[])));
  v_claims := jsonb_set(v_claims, '{app_metadata,is_super_admin}',
                        to_jsonb(v_role = 'super_admin'));

  RETURN jsonb_build_object('claims', v_claims);
END $$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

COMMIT;
```

- [ ] **Step 2: Enable hook in `apps/backend/supabase/config.toml`**

Locate `[auth]` section, add at end:

```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

- [ ] **Step 3: Apply + verify**

```bash
npm run db:reset
npx supabase db execute "SELECT proname FROM pg_proc WHERE proname='custom_access_token_hook';"
```

Expected: `1` row.

- [ ] **Step 4: Restart Supabase locally to load hook**

```bash
npx supabase stop && npx supabase start
```

- [ ] **Step 5: Verify hook fires** — log in as a known staff via SQL editor, then decode access_token and confirm `app_metadata.staff_role` is set.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/supabase/migrations/00024_jwt_custom_claims_hook.sql apps/backend/supabase/config.toml
git commit -m "feat(security): JWT custom_access_token_hook injects staff_role + perms"
```

---

## Task 5: Migration 00025 — Auto-Create Profile on Signup

**Files:**
- Create: `apps/backend/supabase/migrations/00025_ensure_profile_on_signup.sql`

- [ ] **Step 1: Write migration**

```sql
-- 00025_ensure_profile_on_signup.sql
-- Purpose: Trigger ensures every auth.users row has a corresponding profiles
--          row, so super_admin can checkout without FK errors.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: any auth.users without a profile (e.g., super_admin seeded earlier)
INSERT INTO public.profiles (id, email, full_name, created_at)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', ''), u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;
```

- [ ] **Step 2: Apply + verify backfill**

```bash
npm run db:reset
npx supabase db execute "SELECT count(*) FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id WHERE p.id IS NULL;"
```

Expected: `0`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/supabase/migrations/00025_ensure_profile_on_signup.sql
git commit -m "feat(security): trigger auto-creates profiles row for every auth.users insert"
```

---

## Task 6: Migration 00026 — Search Path Audit

**Files:**
- Create: `apps/backend/supabase/migrations/00026_search_path_audit.sql`
- Create: `apps/backend/supabase/tests/rls/search_path_compliance.test.sql`

- [ ] **Step 1: Write migration that re-applies search_path on all SECURITY DEFINER funcs**

```sql
-- 00026_search_path_audit.sql
-- Purpose: Ensure every SECURITY DEFINER function in public schema has
--          SET search_path = public, pg_temp. Re-applies via DDL.

BEGIN;

DO $$
DECLARE
  r record;
  v_args text;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, p.oid,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND (p.proconfig IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM unnest(p.proconfig) c
             WHERE c LIKE 'search_path=%'
           ))
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      r.nspname, r.proname, r.args
    );
    RAISE NOTICE 'Patched search_path on %.%(%)', r.nspname, r.proname, r.args;
  END LOOP;
END $$;

COMMIT;
```

- [ ] **Step 2: Write CI test that verifies compliance**

```sql
-- apps/backend/supabase/tests/rls/search_path_compliance.test.sql
\set ON_ERROR_STOP true

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (p.proconfig IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM unnest(p.proconfig) c
           WHERE c LIKE 'search_path=%'
         ));

  IF v_count > 0 THEN
    RAISE EXCEPTION 'FAIL: % SECURITY DEFINER function(s) without search_path', v_count;
  END IF;
END $$;

\echo 'PASS: all SECURITY DEFINER functions have search_path set';
```

- [ ] **Step 3: Apply migration + run test**

```bash
npm run db:reset
psql $DATABASE_URL -f apps/backend/supabase/tests/rls/search_path_compliance.test.sql
```

Expected: `PASS: all SECURITY DEFINER functions have search_path set`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/supabase/migrations/00026_search_path_audit.sql apps/backend/supabase/tests/rls/search_path_compliance.test.sql
git commit -m "feat(security): enforce search_path on every SECURITY DEFINER function + CI guard"
```

---

## Task 7: pgTAP Tests for Critical RLS Policies

**Files:**
- Create: `apps/backend/supabase/tests/rls/staff_profiles.test.sql`
- Create: `apps/backend/supabase/tests/rls/audit_logs_immutable.test.sql`
- Create: `apps/backend/supabase/tests/rls/payment_transactions.test.sql`

- [ ] **Step 1: Enable pgtap extension (if not enabled)**

Add to a small setup migration `00027_enable_pgtap.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
```

- [ ] **Step 2: Write `staff_profiles.test.sql`**

```sql
BEGIN;
SELECT plan(4);

-- Set up: create a customer + a staff via test helper (assume helper exists or inline)
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';  -- customer UUID
SELECT is_empty(
  $$SELECT * FROM public.staff_profiles$$,
  'customer cannot see any staff_profiles row'
);

SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000002';  -- super_admin UUID
SELECT isnt_empty(
  $$SELECT * FROM public.staff_profiles$$,
  'super_admin can see staff_profiles rows'
);

-- Customer cannot insert
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SELECT throws_ok(
  $$INSERT INTO public.staff_profiles (id, full_name, role_id) VALUES (gen_random_uuid(), 'Hacker', '00000000-0000-0000-0000-000000000099')$$,
  '42501',
  NULL,
  'customer INSERT into staff_profiles is denied'
);

-- super_admin can insert (assuming role_id exists)
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000002';
SELECT lives_ok(
  $$INSERT INTO public.staff_profiles (id, full_name, role_id)
    SELECT gen_random_uuid(), 'New Staff', id FROM public.roles WHERE name='customer_support' LIMIT 1$$,
  'super_admin INSERT into staff_profiles succeeds'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 3: Write `audit_logs_immutable.test.sql`**

```sql
BEGIN;
SELECT plan(2);

-- Insert a row first (as super_admin)
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000002';
INSERT INTO public.audit_logs (actor_id, action, summary, resource_type)
VALUES (auth.uid(), 'test.event', 'test', 'test')
RETURNING id \gset

SELECT throws_ok(
  format($$UPDATE public.audit_logs SET action='hacked' WHERE id='%s'$$, :'id'),
  '42501',
  NULL,
  'super_admin cannot UPDATE audit_logs'
);

SELECT throws_ok(
  format($$DELETE FROM public.audit_logs WHERE id='%s'$$, :'id'),
  '42501',
  NULL,
  'super_admin cannot DELETE audit_logs'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 4: Write `payment_transactions.test.sql`**

```sql
BEGIN;
SELECT plan(2);

SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';

-- Pre-seed: insert a payment_transactions row owned by customer (via test fixture or service_role)
-- For test purposes, assume row with id='aaaa...' exists.

SELECT throws_ok(
  $$UPDATE public.payment_transactions SET status='paid' WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501',
  NULL,
  'customer cannot UPDATE payment_transactions to mark themselves paid'
);

SELECT is_empty(
  $$SELECT * FROM public.payment_transactions WHERE order_id NOT IN (SELECT id FROM public.orders WHERE user_id=auth.uid())$$,
  'customer can only see their own payment_transactions'
);

SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 5: Run pgTAP suite**

```bash
npm run db:test:rls
```

Expected: each `.test.sql` reports PASS for all assertions.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/supabase/tests/rls/*.test.sql apps/backend/supabase/migrations/00027_enable_pgtap.sql
git commit -m "test(security): pgTAP coverage for staff_profiles, audit_logs immutability, payment_transactions"
```

---

## Task 8: `ipHash` Helper

**Files:**
- Create: `apps/web/src/lib/security/ipHash.ts`
- Create: `apps/web/src/lib/security/ipHash.test.ts`

- [ ] **Step 1: Write test**

```typescript
// ipHash.test.ts
import { describe, it, expect } from 'vitest';
import { hashIp } from './ipHash';

describe('hashIp', () => {
  it('returns deterministic hash for same input', () => {
    const a = hashIp('1.2.3.4', 'pepper');
    const b = hashIp('1.2.3.4', 'pepper');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns different hash for different IPs', () => {
    expect(hashIp('1.2.3.4', 'pepper')).not.toBe(hashIp('5.6.7.8', 'pepper'));
  });

  it('returns different hash for different peppers', () => {
    expect(hashIp('1.2.3.4', 'pepperA')).not.toBe(hashIp('1.2.3.4', 'pepperB'));
  });

  it('returns null for empty IP', () => {
    expect(hashIp('', 'pepper')).toBeNull();
    expect(hashIp(null as any, 'pepper')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test --workspace=apps/web -- src/lib/security/ipHash.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// ipHash.ts
import crypto from 'node:crypto';

export function hashIp(ip: string | null | undefined, pepper: string): string | null {
  if (!ip) return null;
  return crypto.createHmac('sha256', pepper).update(ip).digest('hex');
}

export function getServerIpPepper(): string {
  const p = process.env.AUDIT_IP_PEPPER;
  if (!p || p.length < 32) {
    throw new Error('AUDIT_IP_PEPPER must be set to a 32+ char random string');
  }
  return p;
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test --workspace=apps/web -- src/lib/security/ipHash.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/security/ipHash.ts apps/web/src/lib/security/ipHash.test.ts
git commit -m "feat(security): add ipHash helper using HMAC-SHA256"
```

---

## Task 9: `constantDelay` Helper

**Files:**
- Create: `apps/web/src/lib/security/constantDelay.ts`
- Create: `apps/web/src/lib/security/constantDelay.test.ts`

- [ ] **Step 1: Test**

```typescript
// constantDelay.test.ts
import { describe, it, expect } from 'vitest';
import { constantDelay } from './constantDelay';

describe('constantDelay', () => {
  it('ensures total elapsed >= target', async () => {
    const start = Date.now();
    await constantDelay(start, 200);
    expect(Date.now() - start).toBeGreaterThanOrEqual(195);
  });

  it('returns immediately if elapsed >= target', async () => {
    const past = Date.now() - 1000;
    const t0 = Date.now();
    await constantDelay(past, 200);
    expect(Date.now() - t0).toBeLessThan(50);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// constantDelay.ts
export async function constantDelay(startedAt: number, targetMs: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  const remaining = targetMs - elapsed;
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}
```

- [ ] **Step 3: Run + commit**

```bash
npm run test --workspace=apps/web -- src/lib/security/constantDelay.test.ts
git add apps/web/src/lib/security/constantDelay.{ts,test.ts}
git commit -m "feat(security): add constantDelay helper for timing-attack defense"
```

---

## Task 10: `rateLimit` Helper with Progressive Tiers

**Files:**
- Create: `apps/web/src/lib/security/rateLimit.ts`
- Create: `apps/web/src/lib/security/rateLimit.test.ts`

- [ ] **Step 1: Test**

```typescript
// rateLimit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { redis } from '@/lib/redis';
import { checkRateLimit, RateLimitTier } from './rateLimit';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkRateLimit — login by IP', () => {
  it('returns tier 0 (none) on first attempt', async () => {
    (redis.incr as any).mockResolvedValueOnce(1);
    const r = await checkRateLimit('login:ip:1.2.3.4', { window: 900, captchaAt: 3, hardLimit: 30 });
    expect(r.tier).toBe(0);
    expect(r.allowed).toBe(true);
  });

  it('requires captcha at tier 1 (3 fails)', async () => {
    (redis.incr as any).mockResolvedValueOnce(3);
    const r = await checkRateLimit('login:ip:1.2.3.4', { window: 900, captchaAt: 3, hardLimit: 30 });
    expect(r.tier).toBe(1);
    expect(r.requiresCaptcha).toBe(true);
    expect(r.allowed).toBe(true);
  });

  it('hard-blocks at hardLimit (30 fails)', async () => {
    (redis.incr as any).mockResolvedValueOnce(31);
    const r = await checkRateLimit('login:ip:1.2.3.4', { window: 900, captchaAt: 3, hardLimit: 30 });
    expect(r.allowed).toBe(false);
    expect(r.tier).toBe(2);
  });

  it('sets TTL on first hit', async () => {
    (redis.incr as any).mockResolvedValueOnce(1);
    await checkRateLimit('login:ip:1.2.3.4', { window: 900, captchaAt: 3, hardLimit: 30 });
    expect(redis.expire).toHaveBeenCalledWith('login:ip:1.2.3.4', 900);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// rateLimit.ts
import { redis } from '@/lib/redis';

export type RateLimitOptions = {
  window: number;       // seconds
  captchaAt: number;    // count threshold for captcha challenge
  hardLimit: number;    // count above which requests are denied
};

export type RateLimitResult = {
  count: number;
  tier: 0 | 1 | 2;
  allowed: boolean;
  requiresCaptcha: boolean;
};

export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, opts.window);
  }

  if (count > opts.hardLimit) {
    return { count, tier: 2, allowed: false, requiresCaptcha: true };
  }
  if (count >= opts.captchaAt) {
    return { count, tier: 1, allowed: true, requiresCaptcha: true };
  }
  return { count, tier: 0, allowed: true, requiresCaptcha: false };
}

export async function resetRateLimit(key: string): Promise<void> {
  await redis.del(key);
}

export async function checkLoginIpRate(ip: string) {
  return checkRateLimit(`login:ip:${ip}`, { window: 900, captchaAt: 3, hardLimit: 30 });
}

export async function checkLoginEmailRate(emailHash: string) {
  return checkRateLimit(`login:email:${emailHash}`, { window: 900, captchaAt: 5, hardLimit: 100 });
}

export async function checkAdminLoginIpRate(ip: string) {
  return checkRateLimit(`admin_login:ip:${ip}`, { window: 900, captchaAt: 1, hardLimit: 15 });
}

export async function checkRecoverIpRate(ip: string) {
  return checkRateLimit(`recover_backup:ip:${ip}`, { window: 900, captchaAt: 0, hardLimit: 3 });
}
```

- [ ] **Step 3: Run + commit**

```bash
npm run test --workspace=apps/web -- src/lib/security/rateLimit.test.ts
git add apps/web/src/lib/security/rateLimit.{ts,test.ts}
git commit -m "feat(security): rate-limit helper with progressive captcha tiers"
```

---

## Task 11: `auditLog` Helper with DLQ Fallback

**Files:**
- Create: `apps/web/src/lib/security/auditLog.ts`
- Create: `apps/web/src/lib/security/auditLog.test.ts`

- [ ] **Step 1: Test**

```typescript
// auditLog.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audit } from './auditLog';

const mockRpc = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ rpc: mockRpc }),
}));

beforeEach(() => {
  mockRpc.mockReset();
});

describe('audit', () => {
  it('calls log_admin_action_v2 with shaped payload', async () => {
    mockRpc.mockResolvedValue({ data: 'uuid', error: null });
    await audit({ action: 'auth.login_success', severity: 'info', details: { method: 'password' } }, { ip: '1.2.3.4' });
    expect(mockRpc).toHaveBeenCalledWith('log_admin_action_v2', expect.objectContaining({
      p_action: 'auth.login_success',
      p_severity: 'info',
    }));
  });

  it('does NOT throw when RPC fails — routes to DLQ', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('db down') });
    await expect(
      audit({ action: 'auth.login_success', severity: 'info', details: { method: 'password' } })
    ).resolves.toBeUndefined();
  });

  it('hashes IP before sending', async () => {
    process.env.AUDIT_IP_PEPPER = 'a'.repeat(32);
    mockRpc.mockResolvedValue({ data: 'uuid', error: null });
    await audit(
      { action: 'auth.login_success', severity: 'info', details: { method: 'password' } },
      { ip: '1.2.3.4' }
    );
    const call = mockRpc.mock.calls[0][1];
    expect(call.p_ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(call.p_ip_hash).not.toBe('1.2.3.4');
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// auditLog.ts
import { createClient } from '@/lib/supabase/server';
import { hashIp, getServerIpPepper } from './ipHash';

export type AuditEvent =
  | { action: 'auth.login_success'; severity: 'info'; details: { method: 'password' | 'magic_link' | 'oauth' } }
  | { action: 'auth.login_fail'; severity: 'warn'; details: { reason: 'wrong_password' | 'cross_realm' | 'rate_limited' | 'mfa_failed' } }
  | { action: 'auth.rate_limited'; severity: 'warn'; details: { tier: number; key: string } }
  | { action: 'auth.idle_logout'; severity: 'info'; details?: { idleSeconds: number } }
  | { action: 'auth.cross_realm_blocked'; severity: 'warn'; details: { realm: 'storefront' | 'admin' } }
  | { action: 'auth.mfa_enrolled'; severity: 'info' }
  | { action: 'auth.mfa_failed'; severity: 'warn' }
  | { action: 'auth.mfa_success'; severity: 'info' }
  | { action: 'auth.backup_code_used'; severity: 'warn' }
  | { action: 'auth.captcha_challenged'; severity: 'info'; details: { reason: string } }
  | { action: 'auth.magic_link_sent'; severity: 'warn'; details: { email_hash: string } }
  | { action: 'product.created' | 'product.updated' | 'product.archived' | 'product.restored' | 'product.price_changed' | 'product.stock_changed';
      severity: 'info'; entity: 'product'; entity_id: string; summary: string; details?: Record<string, unknown> }
  | { action: 'order.status_changed' | 'order.refunded' | 'order.cancelled' | 'order.shipped' | 'order.note_added';
      severity: 'info' | 'warn'; entity: 'order'; entity_id: string; details?: Record<string, unknown> }
  | { action: 'voucher.created' | 'voucher.updated' | 'voucher.disabled' | 'voucher.used';
      severity: 'info'; entity: 'voucher'; entity_id: string; details?: Record<string, unknown> }
  | { action: 'banner.created' | 'banner.updated' | 'banner.activated' | 'banner.deactivated';
      severity: 'info'; entity: 'banner'; entity_id: string }
  | { action: 'rbac.role_assigned' | 'rbac.role_revoked' | 'rbac.permission_changed';
      severity: 'warn'; entity: 'staff'; entity_id: string; details: Record<string, unknown> }
  | { action: 'setting.updated'; severity: 'info'; entity: 'setting'; details: { key: string; old?: unknown; new: unknown } }
  | { action: 'gdpr.user_anonymized'; severity: 'critical'; entity: 'user'; entity_id: string };

export type AuditContext = {
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
};

let failureCounter = 0;

export async function audit(event: AuditEvent, ctx?: AuditContext): Promise<void> {
  try {
    const supabase = await createClient();
    const ipHash = ctx?.ip ? hashIp(ctx.ip, getServerIpPepper()) : null;

    const { error } = await supabase.rpc('log_admin_action_v2', {
      p_action: event.action,
      p_severity: event.severity,
      p_entity: 'entity' in event ? event.entity : null,
      p_entity_id: 'entity_id' in event ? event.entity_id : null,
      p_summary: 'summary' in event ? event.summary : null,
      p_details: 'details' in event ? event.details ?? null : null,
      p_ip_hash: ipHash,
      p_user_agent: ctx?.userAgent ?? null,
      p_request_id: ctx?.requestId ?? null,
    });
    if (error) throw error;
    failureCounter = 0;
  } catch (err) {
    failureCounter++;
    console.error('[AUDIT_FAILURE]', { event, err });
    try {
      const Sentry = await import('@sentry/nextjs').catch(() => null);
      Sentry?.captureException?.(err, {
        level: 'error',
        tags: { component: 'audit_log', action: event.action },
        extra: { event, ctx },
      });
      if (failureCounter > 10) {
        Sentry?.captureMessage?.('Audit log failing repeatedly', 'fatal');
      }
    } catch { /* sentry not configured — fine */ }

    try {
      const supabase = await createClient();
      await supabase.from('audit_logs_dlq').insert({
        payload: { event, ctx },
        error_msg: err instanceof Error ? err.message : String(err),
      });
    } catch { /* even DLQ failed — only console.error remains */ }
  }
}
```

- [ ] **Step 3: Run + commit**

```bash
npm run test --workspace=apps/web -- src/lib/security/auditLog.test.ts
git add apps/web/src/lib/security/auditLog.{ts,test.ts}
git commit -m "feat(security): audit() helper with discriminated union types + DLQ fallback"
```

---

## Task 12: `jwtClaims` Decode Helper

**Files:**
- Create: `apps/web/src/lib/security/jwtClaims.ts`
- Create: `apps/web/src/lib/security/jwtClaims.test.ts`

- [ ] **Step 1: Test**

```typescript
// jwtClaims.test.ts
import { describe, it, expect } from 'vitest';
import { decodeAccessToken, getStaffRole, isSuperAdmin, getAal } from './jwtClaims';
import { SignJWT } from 'jose';

async function makeToken(payload: Record<string, any>): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(new TextEncoder().encode('test-secret'));
}

describe('jwt claims', () => {
  it('decodes app_metadata.staff_role from token', async () => {
    const token = await makeToken({
      sub: 'u1', aal: 'aal2',
      app_metadata: { staff_role: 'product_manager', is_super_admin: false, permissions: ['products:read'] },
    });
    const claims = decodeAccessToken(token);
    expect(getStaffRole(claims)).toBe('product_manager');
    expect(isSuperAdmin(claims)).toBe(false);
    expect(getAal(claims)).toBe('aal2');
  });

  it('returns null for malformed token', () => {
    expect(decodeAccessToken('not.a.token')).toBeNull();
    expect(decodeAccessToken(null)).toBeNull();
  });

  it('treats missing staff_role as customer', async () => {
    const token = await makeToken({ sub: 'u1', aal: 'aal1' });
    const claims = decodeAccessToken(token);
    expect(getStaffRole(claims)).toBe('customer');
    expect(isSuperAdmin(claims)).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// jwtClaims.ts
import { decodeJwt } from 'jose';

export type AccessTokenClaims = {
  sub: string;
  aal?: 'aal1' | 'aal2';
  app_metadata?: {
    staff_role?: string;
    is_super_admin?: boolean;
    permissions?: string[];
  };
} | null;

export function decodeAccessToken(token: string | null | undefined): AccessTokenClaims {
  if (!token) return null;
  try {
    return decodeJwt(token) as AccessTokenClaims;
  } catch {
    return null;
  }
}

export function getStaffRole(claims: AccessTokenClaims): string {
  return claims?.app_metadata?.staff_role ?? 'customer';
}

export function isSuperAdmin(claims: AccessTokenClaims): boolean {
  return claims?.app_metadata?.is_super_admin === true;
}

export function isStaff(claims: AccessTokenClaims): boolean {
  const role = getStaffRole(claims);
  return role !== 'customer' && role.length > 0;
}

export function getAal(claims: AccessTokenClaims): 'aal1' | 'aal2' {
  return claims?.aal ?? 'aal1';
}

export function hasPermission(claims: AccessTokenClaims, perm: string): boolean {
  return claims?.app_metadata?.permissions?.includes(perm) ?? false;
}
```

- [ ] **Step 3: Run + commit**

```bash
npm run test --workspace=apps/web -- src/lib/security/jwtClaims.test.ts
git add apps/web/src/lib/security/jwtClaims.{ts,test.ts}
git commit -m "feat(security): JWT decode helpers for middleware role checks (zero DB call)"
```

---

## Task 13: Cloudflare Turnstile Verifier

**Files:**
- Create: `apps/web/src/lib/security/turnstile.ts`
- Create: `apps/web/src/lib/security/turnstile.test.ts`

- [ ] **Step 1: Test**

```typescript
// turnstile.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyTurnstile } from './turnstile';

const fetchMock = vi.fn();
beforeEach(() => {
  globalThis.fetch = fetchMock as any;
  fetchMock.mockReset();
  process.env.TURNSTILE_SECRET = 'secret';
});

describe('verifyTurnstile', () => {
  it('returns true on success', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ success: true }) });
    expect(await verifyTurnstile('valid-token', '1.2.3.4')).toBe(true);
  });

  it('returns false on failure', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ success: false, 'error-codes': ['invalid'] }) });
    expect(await verifyTurnstile('bad-token', '1.2.3.4')).toBe(false);
  });

  it('returns false on network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    expect(await verifyTurnstile('token', '1.2.3.4')).toBe(false);
  });

  it('returns true if FEATURE_TURNSTILE_ENABLED=false (skip in dev)', async () => {
    delete process.env.TURNSTILE_SECRET;
    process.env.FEATURE_TURNSTILE_ENABLED = 'false';
    expect(await verifyTurnstile('whatever', '1.2.3.4')).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// turnstile.ts
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  if (process.env.FEATURE_TURNSTILE_ENABLED !== 'true') {
    return true;
  }
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    console.warn('TURNSTILE_SECRET missing — failing closed');
    return false;
  }
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('[turnstile]', err);
    return false;
  }
}
```

- [ ] **Step 3: Run + commit**

```bash
npm run test --workspace=apps/web -- src/lib/security/turnstile.test.ts
git add apps/web/src/lib/security/turnstile.{ts,test.ts}
git commit -m "feat(security): Cloudflare Turnstile verification helper"
```

---

## Task 14: Rewrite `loginCustomer` Server Action

**Files:**
- Modify: `apps/web/src/app/actions/auth.ts`

- [ ] **Step 1: Read existing file** (`apps/web/src/app/actions/auth.ts`) and identify the `loginCustomer` / `signInWithEmail` action's current shape and exports referenced from `LoginForm`.

- [ ] **Step 2: Replace the action**

```typescript
// At top of file — add imports if missing
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'node:crypto';
import { audit } from '@/lib/security/auditLog';
import { checkLoginIpRate, checkLoginEmailRate } from '@/lib/security/rateLimit';
import { constantDelay } from '@/lib/security/constantDelay';
import { verifyTurnstile } from '@/lib/security/turnstile';

const GENERIC_ERROR = 'Email hoặc mật khẩu không đúng';
const TARGET_DELAY_MS = 300;

function emailHash(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

export async function loginCustomer(
  prevState: unknown,
  formData: FormData
): Promise<{ ok: boolean; error?: string; requiresCaptcha?: boolean }> {
  const startedAt = Date.now();
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = h.get('user-agent') ?? null;

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const captchaToken = String(formData.get('cf-turnstile-response') ?? '');

  // 1. Rate-limit by IP
  const ipRate = ip ? await checkLoginIpRate(ip) : null;
  if (ipRate?.allowed === false) {
    await audit({ action: 'auth.rate_limited', severity: 'warn', details: { tier: ipRate.tier, key: 'login:ip' } }, { ip, userAgent });
    await constantDelay(startedAt, TARGET_DELAY_MS);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (ipRate?.requiresCaptcha) {
    const valid = await verifyTurnstile(captchaToken, ip);
    if (!valid) {
      await audit({ action: 'auth.captcha_challenged', severity: 'info', details: { reason: 'tier1_ip' } }, { ip, userAgent });
      await constantDelay(startedAt, TARGET_DELAY_MS);
      return { ok: false, error: GENERIC_ERROR, requiresCaptcha: true };
    }
  }

  // 2. Sign in (server-side; no cookie set yet)
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (ip) await checkLoginIpRate(ip);  // increment counter
    await checkLoginEmailRate(emailHash(email));
    await audit({ action: 'auth.login_fail', severity: 'warn', details: { reason: 'wrong_password' } }, { ip, userAgent });
    await constantDelay(startedAt, TARGET_DELAY_MS);
    return { ok: false, error: GENERIC_ERROR };
  }

  // 3. Role check — staff (non-super_admin) cannot log in to storefront
  const role = data.user.app_metadata?.staff_role as string | undefined;
  const isSuperAdmin = data.user.app_metadata?.is_super_admin === true;
  if (role && role !== 'customer' && !isSuperAdmin) {
    await supabase.auth.signOut();
    await audit({ action: 'auth.cross_realm_blocked', severity: 'warn', details: { realm: 'storefront' } }, { ip, userAgent });
    await constantDelay(startedAt, TARGET_DELAY_MS);
    return { ok: false, error: GENERIC_ERROR };
  }

  await audit({ action: 'auth.login_success', severity: 'info', details: { method: 'password' } }, { ip, userAgent });
  await constantDelay(startedAt, TARGET_DELAY_MS);

  const redirectTo = String(formData.get('redirectTo') ?? '/');
  redirect(redirectTo);
}
```

- [ ] **Step 3: Update `LoginForm` to handle `requiresCaptcha`** — show Turnstile widget when present in result.

In `apps/web/src/app/(storefront)/login/_components/LoginForm.tsx` (path may differ):

```tsx
'use client';
import { useActionState } from 'react';
import { loginCustomer } from '@/app/actions/auth';
import Script from 'next/script';

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginCustomer, null);

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <form action={action}>
        <input name="email" type="email" required />
        <input name="password" type="password" required />
        {state?.requiresCaptcha && (
          <div
            className="cf-turnstile"
            data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY}
          />
        )}
        <button type="submit" disabled={isPending}>
          {isPending ? <Spinner /> : 'Đăng nhập'}
        </button>
        {state?.error && <p className="error">{state.error}</p>}
      </form>
    </>
  );
}

function Spinner() { return <span className="spinner" aria-label="Đang xử lý" />; }
```

- [ ] **Step 4: Run lint + type-check + tests**

```bash
cd apps/web && npm run lint && npm run type-check && cd ../..
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/actions/auth.ts apps/web/src/app/\(storefront\)/login/
git commit -m "feat(security): rewrite loginCustomer with generic error, rate limit, captcha, audit"
```

---

## Task 15: New `loginAdmin` Server Action

**Files:**
- Create: `apps/web/src/app/actions/admin/auth.ts`

- [ ] **Step 1: Implement**

```typescript
// apps/web/src/app/actions/admin/auth.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'node:crypto';
import { audit } from '@/lib/security/auditLog';
import { checkAdminLoginIpRate, checkLoginEmailRate } from '@/lib/security/rateLimit';
import { constantDelay } from '@/lib/security/constantDelay';
import { verifyTurnstile } from '@/lib/security/turnstile';

const GENERIC_ERROR = 'Email hoặc mật khẩu không đúng';
const TARGET_DELAY_MS = 300;

function emailHash(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

export async function loginAdmin(
  prevState: unknown,
  formData: FormData
): Promise<{ ok: boolean; error?: string; requiresCaptcha?: boolean; needsMfa?: boolean }> {
  const startedAt = Date.now();
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = h.get('user-agent') ?? null;

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const captchaToken = String(formData.get('cf-turnstile-response') ?? '');

  // 1. Stricter rate-limit
  const ipRate = ip ? await checkAdminLoginIpRate(ip) : null;
  if (ipRate?.allowed === false) {
    await audit({ action: 'auth.rate_limited', severity: 'warn', details: { tier: ipRate.tier, key: 'admin_login:ip' } }, { ip, userAgent });
    await constantDelay(startedAt, TARGET_DELAY_MS);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (ipRate?.requiresCaptcha) {
    const valid = await verifyTurnstile(captchaToken, ip);
    if (!valid) {
      await constantDelay(startedAt, TARGET_DELAY_MS);
      return { ok: false, error: GENERIC_ERROR, requiresCaptcha: true };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (ip) await checkAdminLoginIpRate(ip);
    await checkLoginEmailRate(emailHash(email));
    await audit({ action: 'auth.login_fail', severity: 'warn', details: { reason: 'wrong_password' } }, { ip, userAgent });
    await constantDelay(startedAt, TARGET_DELAY_MS);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Role check — must be staff or super_admin
  const role = data.user.app_metadata?.staff_role as string | undefined;
  if (!role || role === 'customer') {
    await supabase.auth.signOut();
    await audit({ action: 'auth.cross_realm_blocked', severity: 'warn', details: { realm: 'admin' } }, { ip, userAgent });
    await constantDelay(startedAt, TARGET_DELAY_MS);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Successful auth, but still aal1 — middleware will route to MFA flow
  await audit({ action: 'auth.login_success', severity: 'info', details: { method: 'password' } }, { ip, userAgent });
  await constantDelay(startedAt, TARGET_DELAY_MS);

  // Middleware decides next step (setup-mfa / mfa-challenge / dashboard)
  redirect('/admin');
}
```

- [ ] **Step 2: Update existing admin login page** at `apps/web/src/app/(auth)/admin/login/page.tsx` to use `loginAdmin` and render Turnstile widget when needed.

- [ ] **Step 3: Lint + type-check + commit**

```bash
cd apps/web && npm run lint && npm run type-check && cd ../..
git add apps/web/src/app/actions/admin/auth.ts apps/web/src/app/\(auth\)/admin/login/
git commit -m "feat(security): loginAdmin action with stricter rate limit and audit"
```

---

## Task 16: Middleware Update — JWT Decode + Access Matrix + AAL

**Files:**
- Modify: `apps/web/src/lib/supabase/middleware.ts`

- [ ] **Step 1: Replace middleware with the JWT-aware version**

```typescript
// apps/web/src/lib/supabase/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { decodeAccessToken, getStaffRole, isSuperAdmin, getAal, isStaff } from '@/lib/security/jwtClaims';

const STAFF_BLOCKED_ROUTES = [
  '/cart', '/checkout', '/profile', '/orders', '/wishlist', '/vouchers',
];
const ADMIN_EXEMPT_PATHS = new Set([
  '/admin/login', '/admin/setup-mfa', '/admin/mfa-challenge', '/admin/recover',
]);

const IDLE_TIMEOUT_SECS = 30 * 60;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();
  const claims = decodeAccessToken(session?.access_token ?? null);
  const role = getStaffRole(claims);
  const superAdmin = isSuperAdmin(claims);
  const staff = isStaff(claims);
  const aal = getAal(claims);

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // ========= ADMIN AREA =========
  if (pathname.startsWith('/admin')) {
    if (!user) {
      if (pathname !== '/admin/login') {
        url.pathname = '/admin/login';
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    if (pathname === '/admin/login') {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }

    // Customer or unrecognized → out
    if (!staff && !superAdmin) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Idle timeout for any admin
    const lastActivityCookie = request.cookies.get('admin_last_activity')?.value;
    if (lastActivityCookie && process.env.FEATURE_IDLE_TIMEOUT_ENABLED === 'true') {
      const last = Number(lastActivityCookie);
      if (!Number.isNaN(last) && (Date.now() - last) / 1000 > IDLE_TIMEOUT_SECS) {
        await supabase.auth.signOut();
        url.pathname = '/admin/login';
        url.searchParams.set('reason', 'idle');
        return NextResponse.redirect(url);
      }
    }

    // AAL enforcement for super_admin
    if (superAdmin && !ADMIN_EXEMPT_PATHS.has(pathname)) {
      const factorStatus = request.cookies.get('mfa_factor_status')?.value;
      let hasVerifiedTotp = factorStatus === 'verified';
      if (factorStatus === undefined) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        hasVerifiedTotp = factors?.totp?.some((f) => f.status === 'verified') ?? false;
        supabaseResponse.cookies.set('mfa_factor_status', hasVerifiedTotp ? 'verified' : 'none', {
          httpOnly: true, secure: true, sameSite: 'strict', path: '/admin', maxAge: 300,
        });
      }

      if (!hasVerifiedTotp) {
        url.pathname = '/admin/setup-mfa';
        return NextResponse.redirect(url);
      }
      if (aal === 'aal1') {
        url.pathname = '/admin/mfa-challenge';
        return NextResponse.redirect(url);
      }
    }

    // /admin/system/* requires super_admin
    if (pathname.startsWith('/admin/system') && !superAdmin) {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }

    // Inject CSP nonce for admin
    const nonce = crypto.randomBytes(16).toString('base64');
    const csp = buildAdminCsp(nonce);
    supabaseResponse.headers.set('Content-Security-Policy', csp);
    supabaseResponse.headers.set('x-nonce', nonce);

    return supabaseResponse;
  }

  // ========= STOREFRONT AUTH PAGES =========
  if (pathname === '/login' || pathname === '/register') {
    if (user) {
      url.pathname = staff && !superAdmin ? '/admin' : '/';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // ========= STOREFRONT PROTECTED ROUTES =========
  const isStaffBlocked = STAFF_BLOCKED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  if (isStaffBlocked) {
    if (!user) {
      url.pathname = '/login';
      url.searchParams.set('redirectTo', `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    if (staff && !superAdmin) {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

function buildAdminCsp(nonce: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  return [
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
}
```

- [ ] **Step 2: Verify build still works**

```bash
cd apps/web && npm run lint && npm run type-check && cd ../..
```

- [ ] **Step 3: E2E smoke test (manual)**: log in as customer → try `/admin` → should redirect `/`. Log in as staff → try `/cart` → should redirect `/admin`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/supabase/middleware.ts
git commit -m "feat(security): middleware reads JWT claims, enforces AAL and access matrix"
```

---

## Task 17: Idle Timeout — Ping Route Handler + Client Guard

**Files:**
- Create: `apps/web/src/app/api/auth/ping/route.ts`
- Create: `apps/web/src/components/admin/IdleTimeoutGuard.tsx`
- Modify: `apps/web/src/app/(backoffice)/layout.tsx` to mount the guard

- [ ] **Step 1: Ping route**

```typescript
// apps/web/src/app/api/auth/ping/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const c = await cookies();
  c.set('admin_last_activity', Date.now().toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60,
  });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Client component**

```tsx
// apps/web/src/components/admin/IdleTimeoutGuard.tsx
'use client';
import { useEffect, useRef, useState } from 'react';

const IDLE_MS = 30 * 60 * 1000;        // 30 min
const WARN_BEFORE_MS = 2 * 60 * 1000;   // 2 min
const PING_THROTTLE_MS = 60 * 1000;     // 1 min
const ACTIVITY_THROTTLE_MS = 5 * 1000;  // 5 sec

export function IdleTimeoutGuard() {
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lastPingRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('admin-activity');
    channelRef.current = channel;

    const ping = () => {
      const now = Date.now();
      if (now - lastPingRef.current < PING_THROTTLE_MS) return;
      lastPingRef.current = now;
      fetch('/api/auth/ping', { method: 'POST' }).catch(() => { /* ignore */ });
    };

    let activityThrottle = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - activityThrottle < ACTIVITY_THROTTLE_MS) return;
      activityThrottle = now;
      lastActivityRef.current = now;
      localStorage.setItem('admin_last_activity_local', String(now));
      channel.postMessage({ type: 'activity', at: now });
      ping();
    };

    channel.onmessage = (e) => {
      if (e.data?.type === 'activity' && typeof e.data.at === 'number') {
        lastActivityRef.current = Math.max(lastActivityRef.current, e.data.at);
      }
    };

    const events: (keyof DocumentEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((ev) => document.addEventListener(ev, handleActivity, { passive: true }));

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      setShowWarning(idle > IDLE_MS - WARN_BEFORE_MS && idle < IDLE_MS);
      if (idle >= IDLE_MS) {
        window.location.href = '/admin/login?reason=idle';
      }
    }, 10_000);

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handleActivity));
      clearInterval(interval);
      channel.close();
    };
  }, []);

  if (!showWarning) return null;
  return (
    <div role="dialog" aria-modal="true" className="idle-warning-modal">
      <p>Phiên sắp hết hạn trong 2 phút. Tiếp tục làm việc?</p>
      <button onClick={() => {
        lastActivityRef.current = Date.now();
        channelRef.current?.postMessage({ type: 'activity', at: Date.now() });
        fetch('/api/auth/ping', { method: 'POST' });
        setShowWarning(false);
      }}>Tiếp tục</button>
      <button onClick={() => { window.location.href = '/admin/login?reason=manual'; }}>Đăng xuất</button>
    </div>
  );
}
```

- [ ] **Step 3: Mount in admin layout**

In [apps/web/src/app/(backoffice)/layout.tsx](apps/web/src/app/(backoffice)/layout.tsx), import and render `<IdleTimeoutGuard />` inside `mainWrapper`.

- [ ] **Step 4: Lint + type-check + commit**

```bash
cd apps/web && npm run lint && npm run type-check && cd ../..
git add apps/web/src/app/api/auth/ping/route.ts apps/web/src/components/admin/IdleTimeoutGuard.tsx apps/web/src/app/\(backoffice\)/layout.tsx
git commit -m "feat(security): admin idle timeout with multi-tab BroadcastChannel sync"
```

---

## Task 18: MFA Enrollment Server Action + Page

**Files:**
- Create: `apps/web/src/app/actions/admin/mfa.ts`
- Create: `apps/web/src/app/(auth)/admin/setup-mfa/page.tsx`
- Create: `apps/web/src/app/(auth)/admin/setup-mfa/_components/SetupForm.tsx`

- [ ] **Step 1: Server actions**

```typescript
// apps/web/src/app/actions/admin/mfa.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { audit } from '@/lib/security/auditLog';
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';

export async function startMfaEnrollment(): Promise<{ factorId: string; qrSvg: string; secret: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw error;
  const svg = await QRCode.toString(data.totp.uri, { type: 'svg', width: 220, margin: 1 });
  return { factorId: data.id, qrSvg: svg, secret: data.totp.secret };
}

export async function verifyMfaEnrollment(formData: FormData): Promise<{ ok: boolean; error?: string; backupCodes?: string[] }> {
  const factorId = String(formData.get('factorId'));
  const code = String(formData.get('code'));
  const supabase = await createClient();

  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error) return { ok: false, error: 'Mã không hợp lệ' };

  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (verify.error) return { ok: false, error: 'Mã không hợp lệ' };

  // Generate 8 backup codes
  const codes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{4}/g)!.join('-')
  );
  const { error: rpcErr } = await supabase.rpc('create_backup_codes', { p_codes: codes });
  if (rpcErr) {
    return { ok: false, error: 'Không thể tạo backup codes' };
  }

  const h = await headers();
  await audit(
    { action: 'auth.mfa_enrolled', severity: 'info' },
    { ip: h.get('x-forwarded-for')?.split(',')[0] ?? null, userAgent: h.get('user-agent') }
  );

  // Invalidate cached factor cookie so middleware re-checks
  const c = await cookies();
  c.delete('mfa_factor_status');

  return { ok: true, backupCodes: codes };
}

export async function challengeMfa(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const code = String(formData.get('code'));
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.find((f) => f.status === 'verified');
  if (!factor) return { ok: false, error: 'Chưa có TOTP factor' };

  const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challenge.error) return { ok: false, error: 'Lỗi hệ thống' };

  const verify = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.data.id,
    code,
  });
  if (verify.error) {
    const h = await headers();
    await audit(
      { action: 'auth.mfa_failed', severity: 'warn' },
      { ip: h.get('x-forwarded-for')?.split(',')[0] ?? null, userAgent: h.get('user-agent') }
    );
    return { ok: false, error: 'Mã không hợp lệ' };
  }

  const h = await headers();
  await audit(
    { action: 'auth.mfa_success', severity: 'info' },
    { ip: h.get('x-forwarded-for')?.split(',')[0] ?? null, userAgent: h.get('user-agent') }
  );
  redirect('/admin');
}
```

- [ ] **Step 2: Setup page**

```tsx
// apps/web/src/app/(auth)/admin/setup-mfa/page.tsx
import { startMfaEnrollment } from '@/app/actions/admin/mfa';
import { SetupForm } from './_components/SetupForm';

export const dynamic = 'force-dynamic';

export default async function SetupMfaPage() {
  const enroll = await startMfaEnrollment();
  return (
    <main className="setup-mfa">
      <h1>Thiết lập xác thực 2 lớp</h1>
      <p>Quét mã QR bằng Google Authenticator / 1Password / Authy.</p>
      <div dangerouslySetInnerHTML={{ __html: enroll.qrSvg }} />
      <details>
        <summary>Không quét được? Nhập mã thủ công</summary>
        <code>{enroll.secret}</code>
      </details>
      <SetupForm factorId={enroll.factorId} />
    </main>
  );
}
```

- [ ] **Step 3: Setup form (client)**

```tsx
// apps/web/src/app/(auth)/admin/setup-mfa/_components/SetupForm.tsx
'use client';
import { useActionState, useState } from 'react';
import { verifyMfaEnrollment } from '@/app/actions/admin/mfa';
import { useRouter } from 'next/navigation';

export function SetupForm({ factorId }: { factorId: string }) {
  const [state, action, isPending] = useActionState(verifyMfaEnrollment, null);
  const [acked, setAcked] = useState(false);
  const router = useRouter();

  if (state?.ok && state.backupCodes && !acked) {
    return (
      <section>
        <h2>Lưu backup codes</h2>
        <p><strong>QUAN TRỌNG:</strong> Lưu các mã sau ở nơi an toàn. Mỗi mã chỉ dùng được 1 lần.</p>
        <ul>{state.backupCodes.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
        <button onClick={() => {
          const blob = new Blob([state.backupCodes!.join('\n')], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'veganglow-backup-codes.txt'; a.click();
        }}>Tải xuống .txt</button>
        <button onClick={() => { setAcked(true); router.replace('/admin'); }}>
          Tôi đã lưu các mã
        </button>
      </section>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="factorId" value={factorId} />
      <input
        name="code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        autoFocus
        required
        placeholder="123456"
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Đang xác thực…' : 'Xác nhận'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

- [ ] **Step 4: Lint + type-check + commit**

```bash
cd apps/web && npm run lint && npm run type-check && cd ../..
git add apps/web/src/app/actions/admin/mfa.ts apps/web/src/app/\(auth\)/admin/setup-mfa/
git commit -m "feat(security): MFA TOTP enrollment with server-side QR + backup codes"
```

---

## Task 19: MFA Challenge Page

**Files:**
- Create: `apps/web/src/app/(auth)/admin/mfa-challenge/page.tsx`
- Create: `apps/web/src/app/(auth)/admin/mfa-challenge/_components/ChallengeForm.tsx`

- [ ] **Step 1: Page**

```tsx
// apps/web/src/app/(auth)/admin/mfa-challenge/page.tsx
import { ChallengeForm } from './_components/ChallengeForm';
export const dynamic = 'force-dynamic';

export default function MfaChallengePage() {
  return (
    <main className="mfa-challenge">
      <h1>Xác thực 2 lớp</h1>
      <p>Nhập mã 6 chữ số từ ứng dụng Authenticator.</p>
      <ChallengeForm />
      <p>
        Mất Authenticator? <a href="/admin/recover">Khôi phục bằng backup code</a>
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Form**

```tsx
// apps/web/src/app/(auth)/admin/mfa-challenge/_components/ChallengeForm.tsx
'use client';
import { useActionState } from 'react';
import { challengeMfa } from '@/app/actions/admin/mfa';

export function ChallengeForm() {
  const [state, action, isPending] = useActionState(challengeMfa, null);
  return (
    <form action={action}>
      <input
        name="code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        autoFocus
        required
        placeholder="123456"
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Đang xác thực…' : 'Xác nhận'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(auth\)/admin/mfa-challenge/
git commit -m "feat(security): MFA challenge page for super_admin login"
```

---

## Task 20: Backup Code Recovery

**Files:**
- Create: `apps/web/src/app/actions/admin/recover.ts`
- Create: `apps/web/src/app/(auth)/admin/recover/page.tsx`

- [ ] **Step 1: Action**

```typescript
// apps/web/src/app/actions/admin/recover.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { audit } from '@/lib/security/auditLog';
import { checkRecoverIpRate } from '@/lib/security/rateLimit';
import { constantDelay } from '@/lib/security/constantDelay';

export async function recoverWithBackupCode(
  prevState: unknown,
  formData: FormData
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const startedAt = Date.now();
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0] ?? null;

  if (ip) {
    const r = await checkRecoverIpRate(ip);
    if (!r.allowed) {
      await constantDelay(startedAt, 500);
      return { ok: false, error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' };
    }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const code = String(formData.get('code') ?? '').trim();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('verify_backup_code', { p_email: email, p_code: code });

  if (error || !data?.ok) {
    await audit({ action: 'auth.login_fail', severity: 'warn', details: { reason: 'wrong_password' } }, { ip });
    await constantDelay(startedAt, 500);
    return { ok: false, error: 'Mã không hợp lệ' };
  }

  await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/setup-mfa?reenroll=true` },
  });

  await audit({ action: 'auth.magic_link_sent', severity: 'warn', details: { email_hash: 'see-server' } }, { ip });
  await constantDelay(startedAt, 500);
  return { ok: true, message: 'Đã gửi link đăng nhập tới email của bạn. Vui lòng kiểm tra hộp thư.' };
}
```

- [ ] **Step 2: Page + form**

```tsx
// apps/web/src/app/(auth)/admin/recover/page.tsx
'use client';
import { useActionState } from 'react';
import { recoverWithBackupCode } from '@/app/actions/admin/recover';

export default function RecoverPage() {
  const [state, action, isPending] = useActionState(recoverWithBackupCode, null);
  return (
    <main>
      <h1>Khôi phục bằng backup code</h1>
      <form action={action}>
        <input name="email" type="email" required placeholder="email@veganglow.com" />
        <input name="code" required pattern="[A-F0-9]{4}-[A-F0-9]{4}" placeholder="ABCD-1234" />
        <button type="submit" disabled={isPending}>
          {isPending ? 'Đang xử lý…' : 'Khôi phục'}
        </button>
      </form>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && <p className="success">{state.message}</p>}
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/actions/admin/recover.ts apps/web/src/app/\(auth\)/admin/recover/
git commit -m "feat(security): MFA backup-code recovery via SECURITY DEFINER RPC + magic link"
```

---

## Task 21: Audit Logs UI (super_admin)

**Files:**
- Create: `apps/web/src/app/(backoffice)/admin/system/audit-logs/page.tsx`
- Create: `_components/AuditLogTable.tsx`, `AuditLogFilters.tsx`, `AuditLogDetailPanel.tsx`

- [ ] **Step 1: Page (Server Component)**

```tsx
// apps/web/src/app/(backoffice)/admin/system/audit-logs/page.tsx
import { createClient } from '@/lib/supabase/server';
import { AuditLogFilters } from './_components/AuditLogFilters';
import { AuditLogTable } from './_components/AuditLogTable';

export const dynamic = 'force-dynamic';

type Search = {
  action?: string;
  severity?: string;
  actor?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: string;
};

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 50;
  const supabase = await createClient();

  let query = supabase
    .from('audit_logs')
    .select('id, actor_id, action, severity, entity, entity_id, summary, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (sp.action) query = query.eq('action', sp.action);
  if (sp.severity) query = query.eq('severity', sp.severity);
  if (sp.actor) query = query.eq('actor_id', sp.actor);
  if (sp.from) query = query.gte('created_at', sp.from);
  if (sp.to) query = query.lte('created_at', sp.to);
  if (sp.q) query = query.ilike('summary', `%${sp.q}%`);

  const { data, count } = await query;

  return (
    <div>
      <h1>Audit Logs</h1>
      <AuditLogFilters />
      <AuditLogTable rows={data ?? []} />
      <p>Total: {count ?? 0} | Page {page}</p>
    </div>
  );
}
```

- [ ] **Step 2: Components** — write `AuditLogFilters` (form with action/severity/range), `AuditLogTable` (renders rows + click → detail panel), `AuditLogDetailPanel` (slide-over showing full row + JSON details). Implement minimally; structure not critical for security.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(backoffice\)/admin/system/audit-logs/
git commit -m "feat(security): audit logs UI for super_admin (filter, table, detail panel)"
```

---

## Task 22: Storefront CSP Headers in `next.config.mjs`

**Files:**
- Modify: `apps/web/next.config.mjs`

- [ ] **Step 1: Add `headers()` for storefront** (admin CSP is already set per-request in middleware)

```javascript
const isProd = process.env.NODE_ENV === 'production';

const baseHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
];
if (isProd) {
  baseHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}

const storefrontCSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",  // Phase: report-only first; tighten with hashes once stable
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

const cspHeaderName = process.env.FEATURE_CSP_ENFORCE === 'true'
  ? 'Content-Security-Policy'
  : 'Content-Security-Policy-Report-Only';

// inside next config object:
async headers() {
  return [
    {
      source: '/((?!admin|api/auth/ping).*)',
      headers: [...baseHeaders, { key: cspHeaderName, value: storefrontCSP }],
    },
  ];
},
```

> Note: `'unsafe-inline'` is intentionally kept until Phase 7 of rollout (CSP report-only collected, then hash-based tightening). The plan ships report-only mode by default.

- [ ] **Step 2: Lint + commit**

```bash
cd apps/web && npm run lint && cd ../..
git add apps/web/next.config.mjs
git commit -m "feat(security): security headers + CSP report-only for storefront"
```

---

## Task 23: Defense-in-Depth Checks in Server Components

**Files:**
- Modify: `apps/web/src/app/(storefront)/cart/page.tsx`
- Modify: `apps/web/src/app/(storefront)/checkout/page.tsx`
- Modify: `apps/web/src/app/(storefront)/(account)/orders/page.tsx`
- Modify: `apps/web/src/app/(storefront)/(account)/profile/page.tsx`
- Modify: `apps/web/src/app/(storefront)/wishlist/page.tsx`

- [ ] **Step 1: Add staff-block guard at top of each page**

For each page, near the top of the Server Component function:

```typescript
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// inside page:
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const role = user.app_metadata?.staff_role as string | undefined;
  const superAdmin = user.app_metadata?.is_super_admin === true;
  if (role && role !== 'customer' && !superAdmin) {
    notFound();
  }
}
```

- [ ] **Step 2: Lint + commit**

```bash
cd apps/web && npm run lint && npm run type-check && cd ../..
git add apps/web/src/app/\(storefront\)/
git commit -m "feat(security): defense-in-depth — Server Component blocks staff from purchase routes"
```

---

## Task 24: Wire `audit()` Calls Into Existing Mutations

**Files:**
- Modify: `apps/web/src/app/actions/admin/products.ts`
- Modify: `apps/web/src/app/actions/admin/orders.ts` (or equivalent)
- Modify: `apps/web/src/app/actions/admin/marketing.ts` (vouchers/banners)
- Modify: `apps/web/src/app/actions/staff.ts`
- Modify: `apps/web/src/app/actions/admin/customers.ts`

- [ ] **Step 1: For each create/update/delete action, append `audit()` call after success**

Example for products:

```typescript
import { audit } from '@/lib/security/auditLog';
import { headers } from 'next/headers';

// ... after successful update:
const h = await headers();
await audit(
  {
    action: 'product.updated',
    severity: 'info',
    entity: 'product',
    entity_id: productId,
    summary: `Updated product "${name}"`,
    details: { changes: diff },
  },
  { ip: h.get('x-forwarded-for')?.split(',')[0] ?? null, userAgent: h.get('user-agent') }
);
```

Repeat for: product.{created,updated,archived,restored,price_changed,stock_changed}, order.status_changed, voucher.{created,updated,disabled}, banner.{created,updated,activated,deactivated}, customer.{banned,unbanned}, rbac.{role_assigned,role_revoked,permission_changed}, setting.updated.

- [ ] **Step 2: Lint + commit**

```bash
cd apps/web && npm run lint && npm run type-check && cd ../..
git add apps/web/src/app/actions/
git commit -m "feat(security): wire audit() into all admin mutations"
```

---

## Task 25: E2E Security Tests (Playwright)

**Files:**
- Create: `apps/web/e2e/security/account-enumeration.spec.ts`
- Create: `apps/web/e2e/security/aal-bypass.spec.ts`
- Create: `apps/web/e2e/security/multi-tab-idle.spec.ts`

- [ ] **Step 1: Account enumeration test**

```typescript
// apps/web/e2e/security/account-enumeration.spec.ts
import { test, expect } from '@playwright/test';

const cases: Array<{ label: string; email: string; password: string }> = [
  { label: 'wrong password',     email: 'customer1@example.com',     password: 'wrong' },
  { label: 'non-existent email', email: 'noone@nowhere.example',     password: 'wrong' },
  { label: 'staff on storefront',email: 'staff@veganglow.com',        password: 'wrong' },
];

test.describe('login does not leak account state', () => {
  for (const c of cases) {
    test(c.label, async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', c.email);
      await page.fill('input[name="password"]', c.password);
      const start = Date.now();
      await page.click('button[type="submit"]');
      await expect(page.locator('.error')).toContainText('Email hoặc mật khẩu không đúng');
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(290);
      expect(elapsed).toBeLessThanOrEqual(2000);  // sanity ceiling
    });
  }
});
```

- [ ] **Step 2: AAL bypass test**

```typescript
// apps/web/e2e/security/aal-bypass.spec.ts
import { test, expect } from '@playwright/test';

test('super_admin cannot bypass setup-mfa by typing /admin/dashboard', async ({ page }) => {
  // Pre-condition: super_admin without TOTP factor (test fixture)
  await page.goto('/admin/login');
  await page.fill('input[name="email"]', 'super@veganglow.com');
  await page.fill('input[name="password"]', 'TestPass!2026');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/admin\/setup-mfa/);

  // Attempt bypass
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/setup-mfa/);
});
```

- [ ] **Step 3: Multi-tab idle test (skeleton — requires fake timers or long-running)**

```typescript
// apps/web/e2e/security/multi-tab-idle.spec.ts
import { test, expect } from '@playwright/test';

test.skip('multi-tab idle does not log out active tab', async () => {
  // Manual test for now: browser fixture with 30 min wait is impractical in CI.
  // Document expected flow.
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/security/
git commit -m "test(security): e2e tests for account enumeration, AAL bypass, multi-tab idle skeleton"
```

---

## Task 26: Documentation — RLS Matrix + Threat Model

**Files:**
- Create: `docs/security/rls-matrix.md`
- Create: `docs/security/threat-model.md`

- [ ] **Step 1: Write `rls-matrix.md`** — copy the Tier 1/2/3 tables from spec §4 verbatim into a living-doc format with: table name, expected RLS policies per command, "last reviewed" date. Future devs cross-check before adding tables.

- [ ] **Step 2: Write `threat-model.md`** — STRIDE-style table mapping each attack category from spec §1 to: which mitigation, which file enforces it, which test verifies it.

- [ ] **Step 3: Commit**

```bash
git add docs/security/
git commit -m "docs(security): RLS matrix + threat model living docs"
```

---

## Task 27: Smoke Test Pass + Cleanup

**Goal:** Run all CI checks, manual smoke test on 375px viewport, fix any regressions.

- [ ] **Step 1: Run all checks**

```bash
cd apps/web && npm run lint && npm run type-check && npm run test && cd ../..
npm run db:test:rls
npm run db:test:security-definer
```

Expected: all pass.

- [ ] **Step 2: Mobile viewport smoke test**

Open DevTools → 375px width. Manually verify:
- Admin login form usable
- MFA challenge input usable
- Audit log table scrolls horizontally
- Idle timeout modal renders

- [ ] **Step 3: securityheaders.com scan**

Visit https://securityheaders.com/?q=https://your-staging.url&hide=on&followRedirects=on — expect score ≥ A (full A+ requires CSP enforce, which is phase 7).

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore(security): smoke fixes after full integration"
```

---

## Task 28: Run /review and /security-review

- [ ] **Step 1:** From repo root, with all changes staged on the security-hardening branch, ask the user to run `/review` and `/security-review` slash commands (these are user-invoked tools — the agent cannot launch them).

- [ ] **Step 2:** Address any blocker findings.

- [ ] **Step 3:** Mark the master TodoWrite item for Sub-project #1 complete; move to Sub-project #2 (Dashboard 2.0) per the brainstorming roadmap.

---

## Self-Review Notes

Spec coverage check:
- §1 26 success criteria — covered: tasks 14/15 (criteria 1-3, 9), 17 (4, 10), 7 (5), 11 + 24 (6), 22 + 16 (7, 18, 21, 22), 18-20 (8, 19, 20, 24, 25, 26), 16 (11), 5 (12), 6 (13), 11 (14, 15, 16, 17), 18 (23).
- §2-7 architecture — covered by tasks 4 (JWT hook), 16 (middleware), 8-13 (helpers), 14-21 (server actions + UI), 22 (CSP), 23 (defense layer 2), 24 (audit wiring), 25 (E2E), 26 (docs).
- Placeholder scan: no TBDs. Task 21 step 2 says "Implement minimally" — acceptable as the audit log UI structure is bounded by data shape from §5.4 of spec, not a hidden requirement.
- Type consistency: `AuditEvent`, `audit()` signature consistent across tasks 11, 14, 15, 18, 19, 20, 24. `decodeAccessToken` / `getStaffRole` / `isSuperAdmin` consistent across tasks 12, 16, 23.

Open follow-ups parked for sub-project closeout (Task 28):
- CSP hash extraction script (still uses `'unsafe-inline'` in storefront — switch to hash-based once Sentry collects violation report).
- Audit log retention partitioning (phase 2 — explicitly out of scope per spec §5.5).
