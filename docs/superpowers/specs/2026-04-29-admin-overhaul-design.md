# Admin Backoffice Overhaul — Design Spec

**Date:** 2026-04-29
**Branch:** `feature/admin-page` (worktree at `VeganGlow-admin/`)
**Base:** commit `732053c` (`main`)
**Owner:** Phạm Hoài Thương (binmin81@gmail.com)

---

## 1. Mục tiêu

Đại tu toàn bộ admin backoffice (`apps/web/src/app/(backoffice)/admin/`) thành **CRM + E-commerce admin hoàn chỉnh** cho VeganGlow:

- **UI:** đồng bộ design language botanical + glassmorphism trên cả 10 trang
- **Data:** xóa hết mock/hardcoded data, mọi dữ liệu fetch từ Supabase qua RLS
- **Architecture:** chuyển từ `'use client'` + `useEffect` sang Server Components fetch (theo `CLAUDE.md`)
- **CRM features:** quản trị khách hàng, nhân sự (RBAC), marketing — đủ bộ
- **E-com features:** quản trị sản phẩm, danh mục, đơn hàng — đủ bộ

## 2. Non-goals (out of scope)

- ❌ Storefront pages (`(storefront)/...`) — không đụng. Bug `Phone` import là pre-existing storefront issue, sẽ fix tactical 1 commit riêng nếu CI block, nhưng không nằm trong scope đại tu.
- ❌ Mobile app (`apps/mobile`)
- ❌ Edge Functions mới (chỉ dùng cái có sẵn)
- ❌ Schema DB thay đổi lớn — schema đã đầy đủ qua 10 migrations. Chỉ thêm cột nhỏ nếu thật sự thiếu.
- ❌ Authentication flow / admin login UI
- ❌ Tính năng mới ngoài CRM/E-com (vd: chat, tickets, helpdesk)

## 3. Hiện trạng (audit)

**10 trang hiện có** trong `apps/web/src/app/(backoffice)/admin/`:

| Page | Hiện trạng | Mock data ảo? |
|---|---|---|
| `page.tsx` (Dashboard) | Client + useEffect fetch | KPI hard-code labels OK, data từ DB |
| `orders` | Client + useEffect fetch | OK, fetch từ DB |
| `products` | Client + useEffect fetch | OK, fetch từ DB |
| `categories` | Client + useEffect fetch | OK, fetch từ DB |
| `customers` | Client + useEffect fetch | OK, fetch từ DB |
| `users` | Client + useEffect fetch | OK, fetch từ DB |
| `roles` | Client + hardcoded `PERMISSIONS[]` | ❌ **CÓ MOCK** — array constant ở frontend, DB đã có table `permissions` |
| `marketing` | Client + useEffect fetch | OK, fetch từ DB (vouchers, banners) |
| `profile` | Client + useEffect fetch | OK, fetch từ DB |
| `settings` | Client + useEffect fetch | Cần audit kỹ |
| `about-team` | Static page | Có thể có hardcoded team list |

**Schema Supabase đã có** (qua migrations 00001-00010):
- `profiles` (customer + role)
- `staff_profiles`, `staff_invitations`, `roles`, `permissions`, `role_permissions`
- `categories`, `products`
- `orders`, `order_items`
- `addresses`
- `reviews`, `favorites`
- `vouchers`, `banners`
- `audit_log`
- `notifications`, `user_settings`, `user_vouchers`, `wallet_settings`

**Lint debt** trong admin code (sẽ tự nhiên biến mất khi chuyển Server Component):
- `useEffect` gọi function khai báo phía dưới (dashboard, orders, users)
- Missing dependency warnings
- `AdminBreadcrumb.tsx` reassigning `acc` after render

## 4. Kiến trúc — 3 lớp (Approach C: Layered)

### Lớp 1 — Shell & Design Tokens

**Mục đích:** đảm bảo cả 10 trang trông như "một sản phẩm", không phải 10 cái riêng biệt.

**Deliverables:**

1. **Design tokens** (`apps/web/src/styles/admin-tokens.css` — file mới)
   - Palette: ink (text), parchment (bg), botanical green primary, gold accent, status (success/danger/warn/info)
   - Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
   - Radii: sm 8, md 12, lg 16, xl 24
   - Shadows: glass 1/2/3 levels
   - Typography: heading (display + h1..h6), body, caption, mono
   - Motion: 150ms ease-out (default), 250ms ease-in-out (modal)
2. **`admin-shared.module.css` chuẩn hoá** — refactor file hiện có thành reusable patterns:
   - `.pageHeader` (title + subtitle + actions slot)
   - `.kpiCard`, `.kpiGrid`
   - `.dataTable` (header / row / cell / hover / selected / empty / skeleton)
   - `.filterBar` (search input + dropdown filters + sort)
   - `.toolbar` (left actions / right actions)
   - `.modal` (glass overlay, panel, close, header, body, footer)
   - `.formField` (label / input / hint / error)
   - `.button` variants: primary / secondary / ghost / danger / icon-only
   - `.badge` variants: pending / shipping / success / danger / info / muted
   - `.emptyState` (icon + title + description + cta)
   - `.tabBar`
3. **AdminSidebar refine** — collapse/expand state, active highlight, role-based menu visibility (dùng `is_admin()` + permissions)
4. **AdminBreadcrumb refactor** — fix immutability warning, hỗ trợ custom labels từ page
5. **AdminProfileMenu refine** — show staff role label, link tới `/admin/profile`, logout

### Lớp 2 — Data Layer

**Mục đích:** chuyển sang Server Component fetch, xoá mock, đảm bảo RLS.

**Deliverables:**

1. **Tạo `apps/web/src/lib/admin/queries/` directory** — typed server-side data fetchers per domain:
   - `dashboard.ts`: `getDashboardStats(range)`, `getRecentOrders(limit)`
   - `orders.ts`: `listOrders(filters)`, `getOrder(id)`, `updateOrderStatus(id, status)`
   - `products.ts`: `listProducts(filters)`, `getProduct(id)`, `upsertProduct(data)`, `deleteProduct(id)`
   - `categories.ts`: CRUD
   - `customers.ts`: `listCustomers(filters)`, `getCustomerDetail(id)` (kèm orders + addresses)
   - `staff.ts`: `listStaff()`, `inviteStaff(email, role_id)`, `toggleStaffStatus(id)`
   - `roles.ts`: `listRoles()`, `listPermissions()`, `getRolePermissions(role_id)`, `setRolePermissions(role_id, perm_ids[])`
   - `marketing.ts`: `listVouchers()`, `upsertVoucher(data)`, `listBanners()`, `upsertBanner(data)`
   - `audit.ts`: `listAuditEntries(filters)` cho settings
2. **Mỗi page** đổi default export thành Server Component:
   - Fetch ở top-level page function
   - Pass data xuống Client Component con (chỉ cho phần interactive: filter input, modal state)
   - Mutations dùng Server Actions (`apps/web/src/app/actions/admin/*.ts`)
3. **Xoá mock ảo:**
   - `roles/page.tsx`: bỏ `PERMISSIONS[]` hardcoded → fetch `permissions` table
   - `about-team/page.tsx`: nếu có team list hardcoded → migrate sang DB hoặc giữ làm config có chú thích rõ
   - Bất kỳ `[]` placeholder hay sample row nào trong UI → xoá
4. **RLS verify:** mỗi query phải hoạt động khi user có role staff phù hợp; không bypass bằng service role trong client.
5. **Type sync:** chạy `npm run db:types` (root); không có `any` (theo CLAUDE.md rule).

### Lớp 3 — Per-page Polish

**Thứ tự thực hiện** (mỗi page = 1 task trong implementation plan):

1. **Dashboard** (`page.tsx`) — bộ mặt admin
2. **Orders** — luồng nóng nhất e-com
3. **Products** + **Categories** (gộp 1 nhịp vì cùng domain)
4. **Customers**
5. **Users** + **Roles** (gộp vì cùng RBAC)
6. **Marketing** (vouchers + banners + flash sale tab)
7. **Profile**
8. **Settings**
9. **About-team**

**Per-page checklist (apply mọi trang):**
- [ ] Server Component fetch
- [ ] Dùng admin-shared patterns L1, không CSS riêng trừ khi thật sự cần
- [ ] Empty state có icon + CTA
- [ ] Loading skeleton thay loader spinner full-page
- [ ] Mobile 375 viewport tested
- [ ] Tất cả VND giá format chuẩn
- [ ] Action có toast feedback (success/error)
- [ ] Confirm dialog cho destructive action (xoá / huỷ)
- [ ] No `any`
- [ ] Type from DB schema (qua `db:types`)

## 5. Per-page detail brief

### 5.1 Dashboard
- 4 KPI cards: Doanh thu (range), Đơn hàng, Khách mới, Stock cảnh báo
- Range selector: Hôm nay / 7 ngày / 30 ngày
- Recent orders table (5 dòng) — link tới `/admin/orders/[id]`
- Mini chart doanh thu 7 ngày (sparkline đơn giản, SVG vanilla, không lib chart mới)
- Top products theo số lượng bán range
- "Việc cần làm": orders pending count, low stock count → link

### 5.2 Orders
- Toolbar: search code/customer/phone, status filter chips, date range
- Table: code, customer, total, status badge, payment, created_at, actions
- Detail modal: timeline (pending → confirmed → shipping → completed), order_items list, customer info, shipping address, action buttons để chuyển trạng thái
- Bulk actions: chỉ "đánh dấu confirmed" cho danh sách pending

### 5.3 Products
- Toolbar: search, category filter, stock filter (in/low/out), sort
- Grid view (default) + List view toggle
- Card: image, name, category, price VND, stock badge, rating
- Modal upsert: image upload (Supabase Storage), name, slug auto, price, category, stock, ingredients, description, is_active toggle
- Bulk: deactivate, delete (confirm)

### 5.4 Categories
- Compact table view: name, slug, product_count, created_at, actions
- Inline rename hoặc modal upsert
- Slug auto từ name (nhưng cho phép sửa)
- Confirm delete (cảnh báo nếu còn product gắn category)

### 5.5 Customers
- Toolbar: search name/phone/email
- Table: avatar, full_name, phone, city, total_orders, last_order_date, total_spent
- Detail drawer: thông tin profile, addresses list, orders history, vouchers đã dùng

### 5.6 Users (staff)
- Toolbar: search, role filter, status filter (active/inactive)
- Table: avatar, full_name, email, role, department, status, last_active
- Action: invite (modal: email + role + department), toggle status, change role
- Permissions tooltip per role

### 5.7 Roles
- 2-pane layout: roles list (left) + permission matrix (right)
- Matrix: rows = permissions từ DB, columns = roles, cells = checkbox
- Save mỗi role một lần (atomic update role_permissions)
- Built-in role super_admin readonly

### 5.8 Marketing
- 3 tabs: Vouchers / Banners / Flash sale
- **Vouchers:** table list, upsert modal (code, title, type, value, min_order, quota, period, status), copy code button
- **Banners:** card grid với preview, upsert modal (title, subtitle, image upload, gradient, link, placement, period, status)
- **Flash sale:** pill list các sản phẩm đang flash + upsert form (product, discount %, period). (Schema có thể cần check — nếu thiếu table flash_sales, scope lại spec.)

### 5.9 Profile (staff own)
- Avatar upload, basic info (full_name, first/last, username, bio)
- Department, position
- Email/phone (readonly nếu auth-managed)
- Activity timeline lấy từ `audit_log`

### 5.10 Settings
- Tabs: Brand (logo, tên cửa hàng, contact), Payment methods, Shipping zones (nếu có), Notifications template
- Audit log viewer (search by actor / module / date)
- Read-only nếu user không phải super_admin

### 5.11 About-team (public-ish info)
- Quản trị danh sách team members hiển thị ra storefront `/about` (nếu có)
- Drag reorder, avatar, name, role, bio, social links
- Lưu vào table mới `team_members` nếu chưa có (cần migration nhỏ — kiểm tra trong implementation)

### 5.12 Storage assets

- Bucket `product-images` (public read, admin write) — dùng cho products
- Bucket `banner-images` (public read, admin write) — dùng cho banners + about-team avatars
- Helper `apps/web/src/lib/admin/storage.ts`: `uploadImage(bucket, file)` → `{ url, path }`, `deleteImage(bucket, path)`
- Implementation phase audit: nếu bucket chưa tồn tại → tạo qua Supabase CLI (migration SQL hoặc init script)

## 6. Constraints (theo CLAUDE.md)

- Next.js 16 App Router. Server Components default, `'use client'` chỉ cho interactivity.
- TypeScript strict, **NO `any`**.
- Vanilla CSS Modules. Mỗi component có `.module.css` (trừ khi tái dùng `admin-shared`).
- Aesthetic: botanical + glassmorphism + premium.
- Tất cả giá VND format `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.
- File naming: PascalCase components, camelCase hooks/utils.
- Tested ở mobile viewport 375px.
- RLS verified.
- Commands chạy từ root.
- `npm run lint` + `npm run type-check` xanh trước khi đóng task.

## 7. Acceptance Criteria

Spec coi như hoàn thành khi:

1. ✅ Cả 10 trang admin hiển thị đồng bộ design tokens (palette, spacing, typography, components)
2. ✅ Không còn `'use client'` ở page-level trừ trang thực sự cần (modal/form toàn page)
3. ✅ Không còn array dữ liệu nghiệp vụ hardcoded trong UI admin. Constants tĩnh như `STATUS_LABEL`, `RANGE_LABEL`, icon mappings được phép (chúng là labels/config UI, không phải data).
4. ✅ Mọi page fetch từ Supabase qua server client, RLS verified
5. ✅ `npm run lint` xanh cho phần `(backoffice)` (warnings hiện tại biến mất)
6. ✅ `npm run type-check` xanh cho phần `(backoffice)`
7. ✅ Mobile 375 không vỡ layout
8. ✅ CRUD đủ trên: products, categories, vouchers, banners, staff, roles
9. ✅ Audit log ghi nhận thay đổi từ admin actions

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Bug `Phone` ở storefront block CI nhánh admin | Tactical fix 1 dòng import trong commit riêng `fix(storefront): import Phone icon` ở đầu nhánh, không trộn vào commit admin |
| Schema thiếu cho flash_sales / team_members | Implementation phase audit trước, nếu thiếu thì spec migration nhỏ trong plan |
| Server Component breaking RLS với cookies | Dùng `@supabase/ssr` server client (đã có pattern), test bằng staff account thật |
| Mock data ẩn ở chỗ không ngờ | Grep audit ở đầu mỗi task của plan, không ngầm tin "tất cả đã sạch" |
| Worktree drift với main khi user merge profile | Cuối nhánh `feature/admin-page` cần rebase lên `main` trước PR |

## 9. Out-of-this-spec future work

- Realtime updates (Supabase Realtime) cho orders dashboard
- Export đơn hàng CSV
- Bulk import sản phẩm từ Excel
- Dashboard analytics charts đầy đủ (Recharts hoặc tương đương)
- A/B test framework cho banners
- Multi-language admin (hiện tại Vi-only)

---

## 10. Schema audit gate (mở đầu implementation)

Trước khi bắt đầu L3, plan task #1 phải audit schema cho:
- Table `flash_sales` cho Marketing 5.8 — nếu thiếu, plan phụ migration `00011_flash_sales.sql`
- Table `team_members` cho About-team 5.11 — nếu thiếu, plan phụ migration `00012_team_members.sql`
- Storage buckets `product-images`, `banner-images` — nếu thiếu, plan tạo qua SQL/CLI

Nếu audit phát hiện thay đổi schema lớn ngoài spec, dừng và update spec trước.

---

**Next step:** sau khi user approve spec → invoke `superpowers:writing-plans` để chia task implementation chi tiết.
