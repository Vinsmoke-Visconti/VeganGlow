# Test Mode Setup

> Temporary configuration for development & QA. Remove the parallel-access
> notes here once production rollout is complete.

## Super-admin parallel access (storefront ↔ admin)

By design, the role `super_admin` can use **both** realms simultaneously:

| Route | customer | staff (non-super) | super_admin |
|---|---|---|---|
| `/admin/*` | ❌ redirect `/` | ✅ | ✅ |
| `/login`, `/register` | ✅ | ❌ redirect `/admin` | ✅ |
| `/cart`, `/checkout`, `/orders`, `/profile`, `/wishlist` | ✅ | ❌ redirect `/admin` | ✅ |

This is intentional so a Super Admin can:
1. Place test orders end-to-end (storefront).
2. Manage products / orders / etc (admin).
3. Verify the admin actions reflect storefront state.

## Whitelisted accounts

Migration `00029_seed_super_admin.sql` provisions:

- `binmin81@gmail.com` → `super_admin` (parallel access enabled)

If the user is not yet in `auth.users`, the migration leaves a pending invitation
that auto-promotes them on first sign-in (sign-in via Google / email).

## MFA enforcement

Mandatory TOTP enrollment for super_admin is **gated by `FEATURE_MFA_ENFORCED`**.

| Env value | Behavior |
|---|---|
| `FEATURE_MFA_ENFORCED=true` | super_admin without verified TOTP → redirected to `/admin/setup-mfa`; aal1 with factor → `/admin/mfa-challenge` |
| anything else (default) | MFA flow available at `/admin/setup-mfa` but not enforced — useful while testing |

Set in `.env.local`:
```env
# Phase 1 (testing): leave commented out
# FEATURE_MFA_ENFORCED=true
```

## Other feature flags

| Flag | Default | When to flip on |
|---|---|---|
| `FEATURE_TURNSTILE_ENABLED` | `false` | After registering `TURNSTILE_SECRET` + `NEXT_PUBLIC_TURNSTILE_SITEKEY` |
| `FEATURE_IDLE_TIMEOUT_ENABLED` | `false` | After verifying ping route works in staging |
| `FEATURE_CSP_ENFORCE` | `false` (report-only) | After 1 week of clean Sentry CSP reports |
| `FEATURE_USE_JWT_CLAIMS` | n/a (always on) | — |

## Required env vars (production)

```env
AUDIT_IP_PEPPER=<32+ char random hex string>
TURNSTILE_SECRET=<from Cloudflare>
NEXT_PUBLIC_TURNSTILE_SITEKEY=<public side key from Cloudflare>
NEXT_PUBLIC_SITE_URL=https://veganglow.example.com
SENTRY_DSN=<optional, for audit failure routing>
```

## Removing parallel access (post-launch checklist)

When the testing window ends and `binmin81@gmail.com` should be admin-only:

1. Demote to a different staff role (e.g. `product_manager`) via Admin UI:
   - Login `super_admin` → `/admin/users` → find `binmin81@gmail.com` → change role.
2. Or run SQL:
   ```sql
   update public.staff_profiles
   set role_id = (select id from public.roles where name = 'product_manager')
   where id = (select id from auth.users where email = 'binmin81@gmail.com');
   ```
3. Verify: log in as `binmin81@gmail.com` → try `/cart` → should redirect to `/admin`.
4. Set `FEATURE_MFA_ENFORCED=true`.
5. Provision a separate, dedicated super_admin account that uses MFA from day one.
