# Threat Model — VeganGlow Admin Platform

> Last reviewed: 2026-05-01
> Sub-project: Security Hardening (#1)

STRIDE-style mapping: each threat → mitigation → enforcement file → verifying test.

## 1. Account enumeration (Spoofing / Information Disclosure)

| Aspect | Detail |
|---|---|
| **Threat** | Attacker probes login form to learn which emails are staff/customer/non-existent. |
| **Mitigation** | Generic error `"Email hoặc mật khẩu không đúng"` for ALL failure paths; constant-time response (≥300ms). |
| **Enforced by** | `apps/web/src/app/actions/auth.ts:login` and `:adminLogin` |
| **Tested by** | `apps/web/e2e/security/account-enumeration.spec.ts` |

## 2. Brute-force / credential stuffing (Spoofing)

| Aspect | Detail |
|---|---|
| **Threat** | Attacker tries millions of password guesses. |
| **Mitigation** | Progressive challenge: tier 1 (3 fails/IP/15min) → captcha; tier 2 (5 fails) → captcha required + 1s delay; hard 429 at 30 fails/IP/hour. Email never locked — magic-link path. |
| **Enforced by** | `apps/web/src/lib/security/rateLimit.ts` + Cloudflare Turnstile |
| **Tested by** | Manual + load test (CI) |

## 3. Targeted DoS via email lockout (Denial of Service)

| Aspect | Detail |
|---|---|
| **Threat** | Attacker submits 5 wrong passwords for a victim email to lock them out. |
| **Mitigation** | Per-email rate limit triggers magic-link recovery, not lockout. Victim retains access via email. |
| **Enforced by** | `checkLoginEmailRate` in `rateLimit.ts` (`hardLimit: 100` — effectively no lockout) |
| **Tested by** | Spec §1 success criterion #9 |

## 4. Session hijacking (Spoofing)

| Aspect | Detail |
|---|---|
| **Threat** | Admin leaves machine open; intruder walks up and uses the session. |
| **Mitigation** | 30-min idle timeout enforced server-side via `admin_last_activity` cookie. Multi-tab synced via BroadcastChannel. Modal warning at 28 min. |
| **Enforced by** | `apps/web/src/lib/supabase/middleware.ts` + `apps/web/src/components/admin/IdleTimeoutGuard.tsx` |
| **Tested by** | Manual + Playwright `multi-tab-idle.spec.ts` (skipped in CI — manual due to 30min duration) |

## 5. Privilege escalation / IDOR (Elevation / Information Disclosure)

| Aspect | Detail |
|---|---|
| **Threat** | Customer sends crafted request to admin endpoint or reads `staff_profiles`. |
| **Mitigation** | (a) RLS policies tier-1 lock down sensitive tables. (b) Middleware blocks customers from `/admin/*` via JWT decode. (c) Server actions re-check via `is_super_admin` / `has_permission`. (d) Server Components call `notFound()` as defense layer 2. |
| **Enforced by** | `00022_security_hardening_rls_audit.sql`, `middleware.ts`, `lib/security/guardStaffFromStorefront.ts` |
| **Tested by** | `apps/backend/supabase/tests/rls/staff_profiles.test.sql`, `payment_transactions.test.sql` |

## 6. Cross-realm session leak (Confused-deputy / Spoofing)

| Aspect | Detail |
|---|---|
| **Threat** | Staff (non-super_admin) logs into storefront → can place orders, distorting business data. |
| **Mitigation** | Login server actions check `app_metadata.staff_role` post-auth and `signOut()` if cross-realm. Middleware redirects on subsequent requests. Server Component layer calls `notFound()`. |
| **Enforced by** | `actions/auth.ts:login`, `middleware.ts`, `lib/security/guardStaffFromStorefront.ts` |
| **Tested by** | Spec §1 criteria 9, 12; manual smoke |

## 7. Audit log tampering (Repudiation)

| Aspect | Detail |
|---|---|
| **Threat** | Attacker (or super_admin themselves) edits audit_logs to cover tracks. |
| **Mitigation** | RLS policies `FOR UPDATE USING (false)` and `FOR DELETE USING (false)` — even super_admin cannot modify. INSERTs only via SECURITY DEFINER RPC. |
| **Enforced by** | `00023_audit_log_expansion.sql` |
| **Tested by** | `apps/backend/supabase/tests/rls/audit_logs_immutable.test.sql` |

## 8. PII leak via audit log retention (GDPR / PDPA)

| Aspect | Detail |
|---|---|
| **Threat** | Audit logs retain user IPs in plaintext. Right-to-be-forgotten request cannot be honored if logs are immutable. |
| **Mitigation** | IPs stored only as HMAC-SHA256 (`ip_hash`). `anonymize_user_audit_logs(uid)` RPC nulls out PII fields while preserving WHAT happened. Action itself is audit-logged. |
| **Enforced by** | `auditLog.ts:audit`, `00023_audit_log_expansion.sql:anonymize_user_audit_logs` |
| **Tested by** | Manual; spec §1 criterion 14, 15 |

## 9. Search-path attack on SECURITY DEFINER (Elevation)

| Aspect | Detail |
|---|---|
| **Threat** | Attacker creates a same-named function/operator in a schema earlier on `search_path` to hijack an RPC's behavior. |
| **Mitigation** | Every `SECURITY DEFINER` function declares `SET search_path = public, pg_temp`. CI guard fails PR if any function omits it. |
| **Enforced by** | `00027_search_path_audit.sql` retroactively patches; new code must declare. |
| **Tested by** | `apps/backend/supabase/tests/rls/search_path_compliance.test.sql` |

## 10. XSS / clickjacking / MITM (Tampering)

| Aspect | Detail |
|---|---|
| **Threat** | Malicious script injected via product description; admin page embedded in iframe to steal clicks; HTTP downgrade to sniff session. |
| **Mitigation** | (a) Admin: nonce-based CSP injected per-request by middleware, `X-Frame-Options: DENY`. (b) Storefront: report-only CSP for phase 1, hash-based phase 2. (c) HSTS preload (prod only). (d) Cookies `HttpOnly + Secure + SameSite=Strict` for admin-scoped cookies, `Path=/admin`. |
| **Enforced by** | `next.config.mjs`, `middleware.ts:buildAdminCsp`, `IdleTimeoutGuard.tsx` cookie flags |
| **Tested by** | `securityheaders.com` scan; CSP violation reports via Sentry |

## 11. Super-admin account compromise (Spoofing)

| Aspect | Detail |
|---|---|
| **Threat** | Super-admin password leaked. |
| **Mitigation** | Mandatory TOTP enrollment on first login. AAL enforcement in middleware: `aal1 + super_admin + no factor` → forced to `/admin/setup-mfa`; `aal1 + has factor` → forced to `/admin/mfa-challenge`. Backup-code recovery via SECURITY DEFINER RPC + magic link. No "remember device" feature. |
| **Enforced by** | `middleware.ts` AAL block, `app/(auth)/admin/setup-mfa/`, `mfa-challenge/`, `recover/`, `actions/admin/mfa.ts`, `actions/admin/recover.ts`, `00024_mfa_backup_codes.sql` |
| **Tested by** | `e2e/security/aal-bypass.spec.ts` (skipped — needs test fixture) |

## CI gates

| Gate | Command | Fails when |
|---|---|---|
| Vitest unit | `npm run test --workspace=apps/web` | Any helper test fails |
| pgTAP RLS | `npm run db:test:rls` | RLS regression on critical tables |
| search_path | `npm run db:test:security-definer` | Any new SECURITY DEFINER func missing search_path |
| Type-check | `npm run type-check --workspace=apps/web` | TypeScript errors |
| Lint | `npm run lint --workspace=apps/web` | ESLint errors |
| E2E (manual / pre-merge) | `npm run test:e2e --workspace=apps/web` | Account-enumeration / AAL-bypass regression |

## Out of scope (parked for phase 2)

- WAF / DDoS protection (configure at Vercel/Cloudflare edge)
- SSO / SAML for staff
- Audit log partitioning + cold archive
- "Remember this device" cookie for MFA (intentionally rejected)
- Pen-test by external party
