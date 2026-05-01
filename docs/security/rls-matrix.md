# RLS Policy Matrix

Living document. Update when adding/changing tables. Cross-check this matrix
before merging schema changes.

> Last reviewed: 2026-05-01

## Tier 1 — Admin-only / highly sensitive

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `staff_profiles` | self OR super_admin | super_admin | super_admin | super_admin |
| `staff_invitations` | super_admin | super_admin | super_admin | super_admin |
| `audit_logs` | super_admin OR `audit:read` OR self (`actor_id=auth.uid()`) | via `log_admin_action_v2` RPC only | **deny all** | **deny all** |
| `audit_logs_dlq` | super_admin | super_admin | super_admin | super_admin |
| `system_settings` | staff | super_admin | super_admin | super_admin |
| `roles` | staff | super_admin | super_admin | super_admin |
| `permissions` | staff | super_admin | super_admin | super_admin |
| `role_permissions` | staff | super_admin | super_admin | super_admin |
| `user_permissions` | staff | super_admin OR `users:assign_roles` | same | same |
| `payment_transactions` | order owner OR staff `orders:read` | webhook (service_role) | **deny user UPDATE** | super_admin |
| `checkout_idempotency_keys` | RPC only | RPC only | **deny direct** | **deny direct** |
| `user_banks` | self | self | self | self |
| `contact_messages` | staff `customer_support:*` | anon | staff | staff |
| `auth_backup_codes` | self | RPC `create_backup_codes` | RPC | super_admin |
| `private.otp_verifications` | (schema not exposed via PostgREST) | — | — | — |

## Tier 2 — Owner + Admin (PII)

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | self + staff | trigger `handle_new_user` | self only | super_admin |
| `addresses` | self + staff support | self | self | self |
| `orders` | self + staff `orders:read` | RPC `checkout` | RPC `update_order_status` (`orders:write`) | super_admin |
| `order_items` | order owner + staff | RPC `checkout` | denied | denied |
| `user_vouchers` | self + staff | RPC `apply_voucher` or admin grant | denied | denied |
| `user_settings` | self | self | self | self |
| `notifications` | self | service_role / admin | self (mark read) | self |
| `favorites` | self | self | self | self |

## Tier 3 — Public read + Admin write

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `products` | anon if `is_active = true` | staff `products:create` | staff `products:update` | staff `products:delete` |
| `categories` | anon if `is_active = true` | staff `categories:create` | staff `categories:update` | staff `categories:delete` |
| `vouchers` | anon (public fields) | staff `marketing:*` | staff | staff |
| `banners` | anon if active | staff `marketing:*` | staff | staff |
| `flash_sales` | anon if currently active | staff | staff | staff |
| `team_members` | anon if active | staff `content:*` | staff | staff |
| `testimonials` | anon if active | staff `content:*` | staff | staff |
| `blog_posts` | anon if active | staff `content:create` | staff `content:update` | staff `content:delete` |
| `faqs` | anon if active | staff `content:*` | staff | staff |
| `reviews` | anon | customer who purchased (verified via `orders`) | author + staff | staff |

## Common gaps to watch when adding tables

1. `USING (true)` — over-broad.
2. Missing INSERT policy (default = allow if RLS on but no `FOR INSERT`).
3. SELECT bypass via VIEW (views inherit RLS only when created `SECURITY INVOKER`).
4. `SECURITY DEFINER` function without `SET search_path = public, pg_temp` (CI checks).
5. Excessive `GRANT ALL` to `anon` instead of `GRANT SELECT`.
6. Policy uses `auth.email()` instead of `auth.uid()`.
7. `audit_logs` allowing UPDATE — must be immutable.
8. `service_role` used from browser code.
9. Storage bucket policies on `storage.objects`.
10. Status fields user can self-update (e.g. `payment_transactions.status`).

## CI guards

- `npm run db:test:rls` — runs all `apps/backend/supabase/tests/rls/*.test.sql` via `pg_prove`.
- `npm run db:test:security-definer` — verifies every `SECURITY DEFINER` function has `search_path` set.
