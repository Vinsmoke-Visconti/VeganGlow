# Admin Backoffice Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đại tu toàn bộ admin backoffice (10 trang) thành CRM + E-commerce admin chuẩn hoá: UI đồng bộ, dữ liệu thật từ Supabase, Server Components default, không mock ảo, RLS verified.

**Architecture:** 3-layer approach. **L1** thiết lập design tokens + admin shell components. **L2** scaffold typed server queries + server actions cho mọi domain. **L3** redo từng trang trên nền L1+L2, từ Dashboard → About-team. Tận dụng schema Supabase đã có (10 migrations) — chỉ thêm migration nhỏ nếu schema audit phát hiện thiếu.

**Tech Stack:** Next.js 16 (App Router, webpack), TypeScript strict, Supabase (Postgres + RLS + Storage), `@supabase/ssr`, vanilla CSS Modules, lucide-react icons, framer-motion (đã có), Server Actions cho mutations.

**Verification (no test framework available):** mỗi task verify bằng `npm run lint`, `npm run type-check`, và `npm run dev` + manual smoke trong browser (desktop 1440 + mobile 375). Commit sau mỗi step xanh.

**Spec:** [docs/superpowers/specs/2026-04-29-admin-overhaul-design.md](../specs/2026-04-29-admin-overhaul-design.md)

---

## File Structure

**Created:**
- `apps/web/src/styles/admin-tokens.css` — design tokens
- `apps/web/src/lib/admin/queries/dashboard.ts` — dashboard queries
- `apps/web/src/lib/admin/queries/orders.ts` — orders queries
- `apps/web/src/lib/admin/queries/products.ts` — products queries
- `apps/web/src/lib/admin/queries/categories.ts` — categories queries
- `apps/web/src/lib/admin/queries/customers.ts` — customers queries
- `apps/web/src/lib/admin/queries/staff.ts` — staff queries
- `apps/web/src/lib/admin/queries/roles.ts` — roles + permissions queries
- `apps/web/src/lib/admin/queries/marketing.ts` — vouchers, banners, flash queries
- `apps/web/src/lib/admin/queries/audit.ts` — audit log queries
- `apps/web/src/lib/admin/storage.ts` — Supabase Storage helpers
- `apps/web/src/lib/admin/format.ts` — VND, date, status format helpers
- `apps/web/src/lib/admin/permissions.ts` — RBAC helper for menu visibility
- `apps/web/src/app/actions/admin/orders.ts` — order mutations
- `apps/web/src/app/actions/admin/products.ts` — product mutations
- `apps/web/src/app/actions/admin/categories.ts` — category mutations
- `apps/web/src/app/actions/admin/roles.ts` — role-permission mutations
- `apps/web/src/app/actions/admin/marketing.ts` — voucher/banner mutations
- `apps/web/src/app/actions/admin/profile.ts` — staff profile mutations
- `apps/web/src/app/actions/admin/settings.ts` — settings mutations
- Per-page client subcomponents under each `admin/<page>/_components/` as needed

**Modified:**
- `apps/web/src/app/(backoffice)/layout.tsx` — import tokens
- `apps/web/src/app/(backoffice)/AdminSidebar.tsx` — RBAC menu, collapse state
- `apps/web/src/app/(backoffice)/AdminBreadcrumb.tsx` — fix immutability
- `apps/web/src/app/(backoffice)/AdminProfileMenu.tsx` — show role
- `apps/web/src/app/(backoffice)/admin/admin-shared.module.css` — patterns
- `apps/web/src/app/(backoffice)/admin/page.tsx` — Server Component
- `apps/web/src/app/(backoffice)/admin/orders/page.tsx` — Server Component
- `apps/web/src/app/(backoffice)/admin/products/page.tsx` — Server Component
- `apps/web/src/app/(backoffice)/admin/categories/page.tsx` — Server Component
- `apps/web/src/app/(backoffice)/admin/customers/page.tsx` — Server Component
- `apps/web/src/app/(backoffice)/admin/users/page.tsx` — Server Component
- `apps/web/src/app/(backoffice)/admin/roles/page.tsx` — Server Component, remove hardcoded PERMISSIONS
- `apps/web/src/app/(backoffice)/admin/marketing/page.tsx` — Server Component
- `apps/web/src/app/(backoffice)/admin/profile/page.tsx` — Server Component
- `apps/web/src/app/(backoffice)/admin/settings/page.tsx` — Server Component
- `apps/web/src/app/(backoffice)/admin/about-team/page.tsx` — Server Component

**Audit confirmed (created):**
- `apps/backend/supabase/migrations/00011_flash_sales.sql` — flash_sales table
- `apps/backend/supabase/migrations/00012_team_members.sql` — team_members table
- `apps/backend/supabase/migrations/00013_system_settings.sql` — key-value settings
- `apps/backend/supabase/migrations/00014_admin_storage_buckets.sql` — product-images + banner-images buckets

**Audit confirmed (NO migration needed):**
- `audit_log` exists in `00007_admin_features.sql`
- DB types in `database.ts` cover all RBAC + marketing tables

---

## Task 0: Pre-flight Audit

**Files:**
- Read-only

**Goal:** Confirm scope assumptions before writing code. Catch schema gaps that would force a re-spec.

- [ ] **Step 1: Inventory mock data in admin pages**

Run from worktree root:
```bash
cd c:/Users/Terrykote/Desktop/MIS/VeganGlow-admin
grep -rn "const \w* = \[" apps/web/src/app/\(backoffice\)/admin/ | grep -v ".module.css" | grep -v "STATUS_LABEL\|STATUS_CONFIG\|STATUS_BADGE\|RANGE_LABEL\|SEGMENT_LABEL"
```

Expected: at minimum the `roles/page.tsx` `PERMISSIONS` array. Note any other hits — those are mock data to remove during their page's task.

- [ ] **Step 2: Schema audit for `flash_sales` and `team_members`**

```bash
grep -l "flash_sales\|team_members" apps/backend/supabase/migrations/*.sql
```

Record findings:
- `flash_sales` table exists? **YES/NO** → if NO, plan migration in Task 19.
- `team_members` table exists? **YES/NO** → if NO, plan migration in Task 22.

- [ ] **Step 3: Schema audit for storage buckets**

```bash
grep -l "storage.buckets\|create_bucket\|product-images\|banner-images" apps/backend/supabase/migrations/*.sql apps/backend/supabase/schema.sql 2>/dev/null
```

Record: do `product-images` / `banner-images` buckets exist as migration? If NO, plan SQL migration in Task 11/18.

- [ ] **Step 4: Verify generated DB types include all RBAC tables**

```bash
grep -E "roles|permissions|staff_profiles|vouchers|banners|audit_log" apps/web/src/types/database.ts | head -20
```

Expected: types for these tables present. If missing, run `npm run db:types` later before queries (note in Task 6).

- [ ] **Step 5: Document findings in plan**

Edit this file's Task 19 (Flash sales) and Task 22 (About-team) sections with the audit results: either "schema OK, skip migration" or "needs migration 00011/00012".

- [ ] **Step 6: Commit audit notes**

```bash
git add docs/superpowers/plans/2026-04-29-admin-overhaul.md
git commit -m "chore(admin): pre-flight audit notes for schema gaps"
```

---

## Task 1: Design Tokens

**Files:**
- Create: `apps/web/src/styles/admin-tokens.css`
- Modify: `apps/web/src/app/(backoffice)/layout.tsx` (import tokens)

**Goal:** Centralize palette, spacing, radii, shadows, motion as CSS custom properties so every admin component pulls from the same source.

- [ ] **Step 1: Create tokens file**

Create `apps/web/src/styles/admin-tokens.css`:

```css
/* VeganGlow Admin Design Tokens
   Botanical + Glassmorphism + Premium aesthetic. */

:root {
  /* Palette — botanical */
  --vg-ink-900: #0f1411;
  --vg-ink-700: #2c3531;
  --vg-ink-500: #5a655e;
  --vg-ink-300: #a8b5ae;
  --vg-parchment-50: #fbfaf6;
  --vg-parchment-100: #f3f1ea;
  --vg-parchment-200: #e7e3d6;
  --vg-leaf-50: #eef7ef;
  --vg-leaf-100: #d4ecd6;
  --vg-leaf-300: #8fcf95;
  --vg-leaf-500: #56a35e;
  --vg-leaf-700: #2f7236;
  --vg-leaf-900: #1c4520;
  --vg-gold-300: #e6cf85;
  --vg-gold-500: #c9a64e;
  --vg-gold-700: #8a7029;

  /* Status */
  --vg-success-bg: #e9f6eb;
  --vg-success-fg: #1f6b2a;
  --vg-warn-bg: #fdf3da;
  --vg-warn-fg: #8a6212;
  --vg-danger-bg: #fbe6e6;
  --vg-danger-fg: #9b1f1f;
  --vg-info-bg: #e4eef9;
  --vg-info-fg: #1f4a85;
  --vg-pending-bg: #f0e9da;
  --vg-pending-fg: #6b4f1a;

  /* Spacing */
  --vg-space-1: 4px;
  --vg-space-2: 8px;
  --vg-space-3: 12px;
  --vg-space-4: 16px;
  --vg-space-5: 24px;
  --vg-space-6: 32px;
  --vg-space-7: 48px;
  --vg-space-8: 64px;

  /* Radii */
  --vg-radius-sm: 8px;
  --vg-radius-md: 12px;
  --vg-radius-lg: 16px;
  --vg-radius-xl: 24px;
  --vg-radius-pill: 999px;

  /* Shadows — glass layers */
  --vg-shadow-1: 0 1px 2px rgba(15,20,17,0.04), 0 1px 3px rgba(15,20,17,0.06);
  --vg-shadow-2: 0 4px 12px rgba(15,20,17,0.06), 0 2px 4px rgba(15,20,17,0.04);
  --vg-shadow-3: 0 12px 32px rgba(15,20,17,0.10), 0 4px 8px rgba(15,20,17,0.06);
  --vg-glass-bg: rgba(255,255,255,0.72);
  --vg-glass-border: rgba(255,255,255,0.6);
  --vg-glass-blur: 12px;

  /* Typography */
  --vg-font-display: 'Playfair Display', 'Times New Roman', serif;
  --vg-font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --vg-font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --vg-text-xs: 12px;
  --vg-text-sm: 13px;
  --vg-text-base: 14px;
  --vg-text-md: 15px;
  --vg-text-lg: 18px;
  --vg-text-xl: 22px;
  --vg-text-2xl: 28px;
  --vg-text-3xl: 36px;
  --vg-leading-tight: 1.25;
  --vg-leading-normal: 1.5;

  /* Motion */
  --vg-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --vg-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --vg-duration-fast: 150ms;
  --vg-duration-base: 250ms;
  --vg-duration-slow: 400ms;

  /* Layout */
  --vg-sidebar-width: 240px;
  --vg-sidebar-collapsed: 72px;
  --vg-topbar-height: 64px;
  --vg-content-max: 1280px;
}
```

- [ ] **Step 2: Import tokens in backoffice layout**

Open `apps/web/src/app/(backoffice)/layout.tsx`. Add at the top of the imports:

```ts
import '@/styles/admin-tokens.css';
```

(Place after `'use client'` if present, else at the very top with other imports.)

- [ ] **Step 3: Verify**

```bash
cd c:/Users/Terrykote/Desktop/MIS/VeganGlow-admin
npm run type-check --workspace=apps/web
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/styles/admin-tokens.css apps/web/src/app/\(backoffice\)/layout.tsx
git commit -m "feat(admin): add design tokens for botanical glass admin theme"
```

---

## Task 2: Refactor `admin-shared.module.css`

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/admin-shared.module.css`

**Goal:** Replace ad-hoc rules with cohesive primitives that all 10 pages will reuse: page header, KPI grid, data table, filter bar, modal, form fields, buttons, badges, empty state, tab bar.

- [ ] **Step 1: Read current file size**

```bash
wc -l apps/web/src/app/\(backoffice\)/admin/admin-shared.module.css
```
Note line count for reference.

- [ ] **Step 2: Replace contents**

Open `apps/web/src/app/(backoffice)/admin/admin-shared.module.css`. Replace the entire file contents with the canonical pattern set:

```css
/* ============================================================
   admin-shared.module.css — Reusable admin patterns
   Built on tokens from admin-tokens.css (loaded in layout)
============================================================ */

.page {
  padding: var(--vg-space-5) var(--vg-space-6);
  max-width: var(--vg-content-max);
  margin: 0 auto;
  font-family: var(--vg-font-body);
  color: var(--vg-ink-900);
}

.pageHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--vg-space-4);
  margin-bottom: var(--vg-space-6);
  flex-wrap: wrap;
}
.pageTitle {
  font-family: var(--vg-font-display);
  font-size: var(--vg-text-2xl);
  font-weight: 600;
  line-height: var(--vg-leading-tight);
  color: var(--vg-ink-900);
  margin: 0 0 var(--vg-space-2) 0;
}
.pageSubtitle {
  font-size: var(--vg-text-base);
  color: var(--vg-ink-500);
  margin: 0;
}
.pageActions {
  display: flex;
  gap: var(--vg-space-2);
  flex-wrap: wrap;
}

/* ---------------- KPI ---------------- */
.kpiGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--vg-space-4);
  margin-bottom: var(--vg-space-6);
}
.kpiCard {
  background: var(--vg-glass-bg);
  backdrop-filter: blur(var(--vg-glass-blur));
  -webkit-backdrop-filter: blur(var(--vg-glass-blur));
  border: 1px solid var(--vg-glass-border);
  border-radius: var(--vg-radius-lg);
  padding: var(--vg-space-5);
  box-shadow: var(--vg-shadow-1);
  display: flex;
  flex-direction: column;
  gap: var(--vg-space-2);
}
.kpiLabel { font-size: var(--vg-text-sm); color: var(--vg-ink-500); }
.kpiValue {
  font-family: var(--vg-font-display);
  font-size: var(--vg-text-2xl);
  font-weight: 600;
  color: var(--vg-ink-900);
}
.kpiDelta { font-size: var(--vg-text-xs); display: inline-flex; gap: 4px; align-items: center; }
.kpiDeltaUp { color: var(--vg-success-fg); }
.kpiDeltaDown { color: var(--vg-danger-fg); }

/* ---------------- Toolbar / Filter bar ---------------- */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vg-space-3);
  margin-bottom: var(--vg-space-4);
  flex-wrap: wrap;
}
.filterBar {
  display: flex;
  gap: var(--vg-space-2);
  align-items: center;
  flex-wrap: wrap;
  flex: 1;
}
.searchInput {
  display: inline-flex;
  align-items: center;
  gap: var(--vg-space-2);
  padding: var(--vg-space-2) var(--vg-space-3);
  background: var(--vg-parchment-50);
  border: 1px solid var(--vg-parchment-200);
  border-radius: var(--vg-radius-md);
  min-width: 220px;
  flex: 1;
  max-width: 360px;
}
.searchInput input {
  flex: 1; border: 0; background: transparent; outline: none;
  font-size: var(--vg-text-base); color: var(--vg-ink-900);
}
.filterChip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px var(--vg-space-3);
  background: var(--vg-parchment-50);
  border: 1px solid var(--vg-parchment-200);
  border-radius: var(--vg-radius-pill);
  font-size: var(--vg-text-sm);
  cursor: pointer;
  transition: all var(--vg-duration-fast) var(--vg-ease-out);
  color: var(--vg-ink-700);
}
.filterChip:hover { background: var(--vg-leaf-50); border-color: var(--vg-leaf-300); }
.filterChipActive {
  background: var(--vg-leaf-700); border-color: var(--vg-leaf-700); color: #fff;
}

/* ---------------- Data table ---------------- */
.tableWrap {
  background: var(--vg-glass-bg);
  border: 1px solid var(--vg-glass-border);
  border-radius: var(--vg-radius-lg);
  box-shadow: var(--vg-shadow-1);
  overflow: hidden;
  backdrop-filter: blur(var(--vg-glass-blur));
}
.table { width: 100%; border-collapse: collapse; font-size: var(--vg-text-base); }
.table thead th {
  text-align: left;
  padding: var(--vg-space-3) var(--vg-space-4);
  font-size: var(--vg-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vg-ink-500);
  background: var(--vg-parchment-100);
  border-bottom: 1px solid var(--vg-parchment-200);
}
.table tbody td {
  padding: var(--vg-space-3) var(--vg-space-4);
  border-bottom: 1px solid var(--vg-parchment-100);
  color: var(--vg-ink-700);
  vertical-align: middle;
}
.table tbody tr { transition: background var(--vg-duration-fast); }
.table tbody tr:hover { background: var(--vg-leaf-50); }
.tableSkeletonRow { height: 56px; }
.tableSkeletonRow td { padding: 0; }
.tableSkeletonBar {
  height: 14px; margin: var(--vg-space-2);
  border-radius: var(--vg-radius-sm);
  background: linear-gradient(90deg, var(--vg-parchment-100), var(--vg-parchment-200), var(--vg-parchment-100));
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* ---------------- Buttons ---------------- */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--vg-space-2);
  padding: var(--vg-space-2) var(--vg-space-4);
  border-radius: var(--vg-radius-md);
  font-size: var(--vg-text-sm);
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--vg-duration-fast) var(--vg-ease-out);
  background: transparent;
  color: var(--vg-ink-700);
}
.btnPrimary {
  background: var(--vg-leaf-700); color: #fff; border-color: var(--vg-leaf-700);
}
.btnPrimary:hover { background: var(--vg-leaf-900); border-color: var(--vg-leaf-900); }
.btnSecondary {
  background: var(--vg-parchment-50); color: var(--vg-ink-900); border-color: var(--vg-parchment-200);
}
.btnSecondary:hover { background: var(--vg-leaf-50); border-color: var(--vg-leaf-300); }
.btnGhost { background: transparent; border-color: transparent; color: var(--vg-ink-500); }
.btnGhost:hover { background: var(--vg-parchment-100); color: var(--vg-ink-900); }
.btnDanger { background: var(--vg-danger-bg); color: var(--vg-danger-fg); border-color: transparent; }
.btnDanger:hover { background: var(--vg-danger-fg); color: #fff; }
.btnIcon { padding: var(--vg-space-2); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---------------- Badges ---------------- */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px var(--vg-space-2);
  border-radius: var(--vg-radius-pill);
  font-size: var(--vg-text-xs);
  font-weight: 500;
  line-height: 1.4;
}
.badgePending { background: var(--vg-pending-bg); color: var(--vg-pending-fg); }
.badgeShipping { background: var(--vg-info-bg); color: var(--vg-info-fg); }
.badgeInfo { background: var(--vg-info-bg); color: var(--vg-info-fg); }
.badgeSuccess { background: var(--vg-success-bg); color: var(--vg-success-fg); }
.badgeDanger { background: var(--vg-danger-bg); color: var(--vg-danger-fg); }
.badgeWarn { background: var(--vg-warn-bg); color: var(--vg-warn-fg); }
.badgeMuted { background: var(--vg-parchment-100); color: var(--vg-ink-500); }

/* ---------------- Modal ---------------- */
.modalBackdrop {
  position: fixed; inset: 0;
  background: rgba(15,20,17,0.4);
  backdrop-filter: blur(4px);
  z-index: 50;
  display: grid;
  place-items: center;
  padding: var(--vg-space-4);
}
.modalPanel {
  background: var(--vg-parchment-50);
  border: 1px solid var(--vg-glass-border);
  border-radius: var(--vg-radius-lg);
  box-shadow: var(--vg-shadow-3);
  max-width: 640px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modalPanelLg { max-width: 960px; }
.modalHeader {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--vg-space-4) var(--vg-space-5);
  border-bottom: 1px solid var(--vg-parchment-200);
}
.modalTitle {
  font-family: var(--vg-font-display);
  font-size: var(--vg-text-lg);
  margin: 0;
  color: var(--vg-ink-900);
}
.modalBody { padding: var(--vg-space-5); overflow-y: auto; }
.modalFooter {
  display: flex; gap: var(--vg-space-2); justify-content: flex-end;
  padding: var(--vg-space-4) var(--vg-space-5);
  border-top: 1px solid var(--vg-parchment-200);
  background: var(--vg-parchment-100);
}

/* ---------------- Form fields ---------------- */
.formField { display: flex; flex-direction: column; gap: 6px; margin-bottom: var(--vg-space-4); }
.formLabel { font-size: var(--vg-text-sm); color: var(--vg-ink-700); font-weight: 500; }
.formInput, .formTextarea, .formSelect {
  padding: var(--vg-space-2) var(--vg-space-3);
  border: 1px solid var(--vg-parchment-200);
  border-radius: var(--vg-radius-md);
  background: #fff;
  font-size: var(--vg-text-base);
  color: var(--vg-ink-900);
  font-family: inherit;
  transition: border-color var(--vg-duration-fast);
}
.formInput:focus, .formTextarea:focus, .formSelect:focus {
  outline: 0; border-color: var(--vg-leaf-500);
  box-shadow: 0 0 0 3px var(--vg-leaf-100);
}
.formTextarea { resize: vertical; min-height: 80px; }
.formHint { font-size: var(--vg-text-xs); color: var(--vg-ink-500); }
.formError { font-size: var(--vg-text-xs); color: var(--vg-danger-fg); }
.formRow { display: grid; grid-template-columns: 1fr 1fr; gap: var(--vg-space-3); }

/* ---------------- Empty state ---------------- */
.emptyState {
  text-align: center;
  padding: var(--vg-space-7) var(--vg-space-5);
  color: var(--vg-ink-500);
}
.emptyIcon {
  width: 56px; height: 56px;
  margin: 0 auto var(--vg-space-3);
  display: grid; place-items: center;
  background: var(--vg-leaf-50);
  border-radius: var(--vg-radius-pill);
  color: var(--vg-leaf-700);
}
.emptyTitle {
  font-family: var(--vg-font-display);
  font-size: var(--vg-text-lg);
  color: var(--vg-ink-900);
  margin: 0 0 var(--vg-space-2);
}

/* ---------------- Tab bar ---------------- */
.tabBar {
  display: flex;
  gap: var(--vg-space-1);
  border-bottom: 1px solid var(--vg-parchment-200);
  margin-bottom: var(--vg-space-5);
}
.tabBtn {
  padding: var(--vg-space-3) var(--vg-space-4);
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: var(--vg-text-sm);
  color: var(--vg-ink-500);
  transition: all var(--vg-duration-fast);
  display: inline-flex; align-items: center; gap: 6px;
}
.tabBtn:hover { color: var(--vg-ink-900); }
.tabBtnActive {
  color: var(--vg-leaf-700);
  border-bottom-color: var(--vg-leaf-700);
  font-weight: 500;
}

/* ---------------- Loading full ---------------- */
.loadingFull {
  display: grid; place-items: center; height: 60vh;
  color: var(--vg-leaf-700);
}

/* ---------------- Mobile (375) ---------------- */
@media (max-width: 768px) {
  .page { padding: var(--vg-space-4); }
  .pageHeader { flex-direction: column; align-items: stretch; }
  .table { font-size: var(--vg-text-sm); }
  .table thead { display: none; }
  .table, .table tbody, .table tr, .table td { display: block; width: 100%; }
  .table tbody tr {
    border: 1px solid var(--vg-parchment-200);
    border-radius: var(--vg-radius-md);
    margin-bottom: var(--vg-space-3);
    padding: var(--vg-space-3);
  }
  .table tbody td { padding: 4px 0; border: 0; }
  .modalPanel { max-height: 100vh; border-radius: 0; }
}
```

- [ ] **Step 3: Verify lint + type-check**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
```
Expected: 0 errors. Warnings related to admin pages may still exist (cleared per-page in later tasks).

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```
Open `http://localhost:3000/admin` in browser. Pages should still render — they may look unfinished but shouldn't crash. Stop dev server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(backoffice\)/admin/admin-shared.module.css
git commit -m "refactor(admin): unify shared CSS patterns on top of design tokens"
```

---

## Task 3: AdminSidebar Refine

**Files:**
- Modify: `apps/web/src/app/(backoffice)/AdminSidebar.tsx`

**Goal:** Add collapse state, RBAC-driven menu visibility, and use tokens for styling.

- [ ] **Step 1: Read existing sidebar**

```bash
cat apps/web/src/app/\(backoffice\)/AdminSidebar.tsx
```
Take note of the current menu items and structure.

- [ ] **Step 2: Add a `useSidebar` hook for collapsed state**

Create the collapse persistence inline (no new hook file — keep it local to the sidebar). Pattern:

```ts
const [collapsed, setCollapsed] = useState<boolean>(() => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('vg.admin.sidebar.collapsed') === '1';
});
useEffect(() => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('vg.admin.sidebar.collapsed', collapsed ? '1' : '0');
  }
}, [collapsed]);
```

- [ ] **Step 3: Add RBAC-driven visibility**

Each menu item gets an optional `permission?: string` field. Filter visible items using `usePermissions` hook (created in Task 7). For now, leave all items visible — pass `permission` field but ignore filtering. Add a `// permission filtering wired in Task 7` comment on the filter line.

- [ ] **Step 4: Apply tokens (CSS Module)**

Update `apps/web/src/app/(backoffice)/backoffice-layout.module.css` (referenced by sidebar) to use `var(--vg-leaf-700)` for active link, `var(--vg-sidebar-width)` for width, etc. Replace hardcoded color hex values where they exist.

- [ ] **Step 5: Verify**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
npm run dev
```
Open `/admin`, click sidebar collapse toggle, refresh page → state persists. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(backoffice\)/AdminSidebar.tsx apps/web/src/app/\(backoffice\)/backoffice-layout.module.css
git commit -m "feat(admin): collapsible sidebar with persisted state"
```

---

## Task 4: AdminBreadcrumb Fix

**Files:**
- Modify: `apps/web/src/app/(backoffice)/AdminBreadcrumb.tsx`

**Goal:** Fix `react-hooks/immutability` warning by replacing the mutated `acc` accumulator with a pure `reduce`.

- [ ] **Step 1: Replace the segments map**

Open `apps/web/src/app/(backoffice)/AdminBreadcrumb.tsx`. Find the block:

```ts
let acc = '';
const crumbs = segments.map((seg) => {
  acc += `/${seg}`;
  return { href: acc, label: SEGMENT_LABEL[seg] || decodeURIComponent(seg) };
});
```

Replace with:

```ts
const crumbs = segments.reduce<{ href: string; label: string }[]>((list, seg) => {
  const prev = list.length > 0 ? list[list.length - 1].href : '';
  const href = `${prev}/${seg}`;
  list.push({ href, label: SEGMENT_LABEL[seg] || decodeURIComponent(seg) });
  return list;
}, []);
```

- [ ] **Step 2: Verify lint clears the warning**

```bash
npm run lint --workspace=apps/web 2>&1 | grep "AdminBreadcrumb"
```
Expected: no output (warning cleared).

- [ ] **Step 3: Smoke test**

```bash
npm run dev
```
Open `/admin/orders`, `/admin/products`. Breadcrumb should render correctly with same labels as before. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(backoffice\)/AdminBreadcrumb.tsx
git commit -m "fix(admin): replace mutating reduce in breadcrumb to satisfy hook rules"
```

---

## Task 5: AdminProfileMenu Refine

**Files:**
- Modify: `apps/web/src/app/(backoffice)/AdminProfileMenu.tsx`

**Goal:** Show staff role label next to name, link "Hồ sơ" → `/admin/profile`, "Đăng xuất" → server action.

- [ ] **Step 1: Read existing profile menu**

```bash
cat apps/web/src/app/\(backoffice\)/AdminProfileMenu.tsx
```

- [ ] **Step 2: Add role display**

Where the menu shows the user name, add a role pill below using the role display_name from `staff_profiles` joined with `roles`. Receive `role: { display_name: string } | null` as a prop from `layout.tsx` (Server Component).

```tsx
{role && <span className={styles.rolePill}>{role.display_name}</span>}
```

Add CSS to `backoffice-layout.module.css`:

```css
.rolePill {
  display: inline-block;
  font-size: var(--vg-text-xs);
  padding: 2px var(--vg-space-2);
  border-radius: var(--vg-radius-pill);
  background: var(--vg-leaf-100);
  color: var(--vg-leaf-900);
  margin-top: 2px;
}
```

- [ ] **Step 3: Update layout.tsx to fetch role**

In `apps/web/src/app/(backoffice)/layout.tsx` (Server Component):

```ts
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
let role = null;
if (user) {
  const { data } = await supabase
    .from('staff_profiles')
    .select('role:roles(display_name)')
    .eq('id', user.id)
    .maybeSingle();
  role = data?.role ?? null;
}
```

Pass `role` into `<AdminProfileMenu user={user} role={role} />`.

- [ ] **Step 4: Verify**

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
npm run dev
```
Login as admin, visit `/admin`. Role pill shows in profile menu.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(backoffice\)/AdminProfileMenu.tsx apps/web/src/app/\(backoffice\)/layout.tsx apps/web/src/app/\(backoffice\)/backoffice-layout.module.css
git commit -m "feat(admin): show staff role pill in profile menu"
```

---

## Task 6: Server Queries Scaffolding

**Files:**
- Create: `apps/web/src/lib/admin/queries/dashboard.ts`
- Create: `apps/web/src/lib/admin/queries/orders.ts`
- Create: `apps/web/src/lib/admin/queries/products.ts`
- Create: `apps/web/src/lib/admin/queries/categories.ts`
- Create: `apps/web/src/lib/admin/queries/customers.ts`
- Create: `apps/web/src/lib/admin/queries/staff.ts`
- Create: `apps/web/src/lib/admin/queries/roles.ts`
- Create: `apps/web/src/lib/admin/queries/marketing.ts`
- Create: `apps/web/src/lib/admin/queries/audit.ts`
- Create: `apps/web/src/lib/admin/format.ts`
- Create: `apps/web/src/lib/admin/storage.ts`
- Create: `apps/web/src/lib/admin/permissions.ts`

**Goal:** Centralize all server-side data fetching in typed functions consumed by Server Components. Each file exports plain async functions taking the supabase server client.

- [ ] **Step 1: Sync DB types**

```bash
cd c:/Users/Terrykote/Desktop/MIS/VeganGlow-admin
npm run db:types
```
Expected: `apps/web/src/types/database.ts` regenerated with all current tables. If types missing, halt and fix.

- [ ] **Step 2: Create `format.ts`**

```ts
// apps/web/src/lib/admin/format.ts
export function formatVND(value: number | string | null | undefined): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export function formatDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

export function formatDateShort(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: 'badgePending',
  confirmed: 'badgeShipping',
  shipping: 'badgeShipping',
  completed: 'badgeSuccess',
  cancelled: 'badgeDanger',
};
```

- [ ] **Step 3: Create `dashboard.ts`**

```ts
// apps/web/src/lib/admin/queries/dashboard.ts
import { createClient } from '@/lib/supabase/server';

export type DashboardRange = 'today' | '7d' | '30d';

export type DashboardStats = {
  revenue: number;
  orders: number;
  customers: number;
  lowStock: number;
};

export type RecentOrderRow = {
  id: string;
  code: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
};

function rangeStart(range: DashboardRange): Date {
  const d = new Date();
  if (range === 'today') { d.setHours(0, 0, 0, 0); return d; }
  if (range === '7d')   { d.setDate(d.getDate() - 7); return d; }
  d.setDate(d.getDate() - 30);
  return d;
}

export async function getDashboardStats(range: DashboardRange): Promise<DashboardStats> {
  const supabase = await createClient();
  const since = rangeStart(range).toISOString();

  const [{ data: orders }, lowStock, customers] = await Promise.all([
    supabase.from('orders').select('total_amount, status').gte('created_at', since),
    supabase.from('products').select('*', { count: 'exact', head: true }).lt('stock', 5),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
  ]);

  const revenue = (orders ?? [])
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);

  return {
    revenue,
    orders: orders?.length ?? 0,
    customers: customers.count ?? 0,
    lowStock: lowStock.count ?? 0,
  };
}

export async function getRecentOrders(limit = 5): Promise<RecentOrderRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('id, code, customer_name, total_amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as RecentOrderRow[];
}

export async function getRevenueSparkline(days = 7): Promise<{ date: string; total: number }[]> {
  const supabase = await createClient();
  const since = new Date(); since.setDate(since.getDate() - days); since.setHours(0,0,0,0);
  const { data } = await supabase
    .from('orders')
    .select('total_amount, created_at, status')
    .gte('created_at', since.toISOString())
    .neq('status', 'cancelled');

  const buckets: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since); d.setDate(d.getDate() + i);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of data ?? []) {
    const key = row.created_at.slice(0, 10);
    if (key in buckets) buckets[key] += Number(row.total_amount);
  }
  return Object.entries(buckets).map(([date, total]) => ({ date, total }));
}
```

- [ ] **Step 4: Create `orders.ts`, `products.ts`, `categories.ts`, `customers.ts`, `staff.ts`, `roles.ts`, `marketing.ts`, `audit.ts`**

For each file, create a thin module that exports query functions following the `dashboard.ts` shape: `import { createClient } from '@/lib/supabase/server'`, async functions, typed return values.

Minimal stubs are acceptable in this task — every function body must be implemented (no `throw new Error('TODO')`). Return realistic data shapes from Supabase queries. Use the schema from `apps/backend/supabase/schema.sql` and migrations as reference.

For `roles.ts` specifically, include:

```ts
export async function listPermissions() {
  const supabase = await createClient();
  const { data } = await supabase.from('permissions').select('id, module, action, description').order('module');
  return data ?? [];
}

export async function getRolePermissions(roleId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('role_permissions').select('permission_id').eq('role_id', roleId);
  return (data ?? []).map((r) => r.permission_id);
}
```

- [ ] **Step 5: Create `permissions.ts` (RBAC client helper)**

```ts
// apps/web/src/lib/admin/permissions.ts
import { createClient } from '@/lib/supabase/server';

export async function getCurrentStaffPermissions(): Promise<string[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('staff_profiles')
    .select(`role:roles(role_permissions(permission:permissions(module, action)))`)
    .eq('id', user.id)
    .maybeSingle();
  type RpRow = { permission: { module: string; action: string } | null };
  type RoleRow = { role_permissions: RpRow[] };
  const role = (data?.role ?? null) as RoleRow | null;
  const rp = role?.role_permissions ?? [];
  return rp
    .map((r: RpRow) => r.permission)
    .filter((p): p is { module: string; action: string } => Boolean(p))
    .map((p) => `${p.module}:${p.action}`);
}

export function can(permissions: string[], required: string): boolean {
  return permissions.includes(required);
}
```

- [ ] **Step 6: Create `storage.ts`**

```ts
// apps/web/src/lib/admin/storage.ts
import { createBrowserClient } from '@/lib/supabase/client';

export const ADMIN_BUCKETS = {
  productImages: 'product-images',
  bannerImages: 'banner-images',
} as const;

export async function uploadAdminImage(
  bucket: keyof typeof ADMIN_BUCKETS,
  file: File,
  pathPrefix = '',
): Promise<{ url: string; path: string }> {
  const supabase = createBrowserClient();
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${pathPrefix}${pathPrefix ? '/' : ''}${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(ADMIN_BUCKETS[bucket]).upload(path, file, {
    cacheControl: '3600', upsert: false,
  });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(ADMIN_BUCKETS[bucket]).getPublicUrl(path);
  return { url: pub.publicUrl, path };
}

export async function deleteAdminImage(bucket: keyof typeof ADMIN_BUCKETS, path: string): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase.storage.from(ADMIN_BUCKETS[bucket]).remove([path]);
  if (error) throw error;
}
```

- [ ] **Step 7: Verify**

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
```
Expected: 0 errors. If types are missing for any table, run `npm run db:types` again or check migrations.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/admin/
git commit -m "feat(admin): scaffold typed server queries and helpers"
```

---

## Task 7: Server Actions Scaffolding

**Files:**
- Create: `apps/web/src/app/actions/admin/orders.ts`
- Create: `apps/web/src/app/actions/admin/products.ts`
- Create: `apps/web/src/app/actions/admin/categories.ts`
- Create: `apps/web/src/app/actions/admin/roles.ts`
- Create: `apps/web/src/app/actions/admin/marketing.ts`
- Create: `apps/web/src/app/actions/admin/profile.ts`
- Create: `apps/web/src/app/actions/admin/settings.ts`

**Goal:** Centralize all admin mutations as Server Actions with `'use server'`. Each module exports actions returning `{ ok: true } | { ok: false; error: string }`.

- [ ] **Step 1: Create `orders.ts`**

```ts
// apps/web/src/app/actions/admin/orders.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true } | { ok: false; error: string };

export async function updateOrderStatus(id: string, status: 'pending'|'confirmed'|'shipping'|'completed'|'cancelled'): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return { ok: true };
}
```

- [ ] **Step 2: Create `products.ts`, `categories.ts`, `roles.ts`, `marketing.ts`, `profile.ts`, `settings.ts`**

Same pattern. Each exports the actions implied by the page's CRUD needs (see spec section 5). Implement function bodies — no stubs. Always end with `revalidatePath` for the affected route(s).

For `roles.ts`:

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true } | { ok: false; error: string };

export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<Result> {
  const supabase = await createClient();
  const { error: delErr } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
  if (delErr) return { ok: false, error: delErr.message };
  if (permissionIds.length > 0) {
    const rows = permissionIds.map((permission_id) => ({ role_id: roleId, permission_id }));
    const { error: insErr } = await supabase.from('role_permissions').insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }
  revalidatePath('/admin/roles');
  return { ok: true };
}
```

- [ ] **Step 3: Verify**

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/actions/admin/
git commit -m "feat(admin): scaffold server actions for all admin mutations"
```

---

## Task 8: Dashboard

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/_components/RangeSwitch.tsx` (client subcomponent)
- Create: `apps/web/src/app/(backoffice)/admin/_components/Sparkline.tsx` (vanilla SVG client subcomponent)

**Goal:** Convert dashboard to Server Component fetching from queries. Keep range switch + sparkline interactive.

- [ ] **Step 1: Replace `page.tsx` with Server Component**

```tsx
// apps/web/src/app/(backoffice)/admin/page.tsx
import Link from 'next/link';
import { Package, AlertTriangle, Users, DollarSign, ArrowRight } from 'lucide-react';
import {
  getDashboardStats,
  getRecentOrders,
  getRevenueSparkline,
  type DashboardRange,
} from '@/lib/admin/queries/dashboard';
import { formatVND, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from '@/lib/admin/format';
import shared from './admin-shared.module.css';
import styles from './admin-page.module.css';
import { RangeSwitch } from './_components/RangeSwitch';
import { Sparkline } from './_components/Sparkline';

type Props = { searchParams: Promise<{ range?: DashboardRange }> };

export default async function AdminDashboard({ searchParams }: Props) {
  const { range = 'today' } = await searchParams;
  const [stats, recent, sparkline] = await Promise.all([
    getDashboardStats(range),
    getRecentOrders(5),
    getRevenueSparkline(7),
  ]);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Bảng điều khiển</h1>
          <p className={shared.pageSubtitle}>Tổng quan vận hành VeganGlow</p>
        </div>
        <RangeSwitch current={range} />
      </div>

      <div className={shared.kpiGrid}>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}><DollarSign size={14}/> Doanh thu</div>
          <div className={shared.kpiValue}>{formatVND(stats.revenue)}</div>
        </div>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}><Package size={14}/> Đơn hàng</div>
          <div className={shared.kpiValue}>{stats.orders}</div>
        </div>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}><Users size={14}/> Khách hàng</div>
          <div className={shared.kpiValue}>{stats.customers}</div>
        </div>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}><AlertTriangle size={14}/> Stock thấp</div>
          <div className={shared.kpiValue}>{stats.lowStock}</div>
        </div>
      </div>

      <section className={styles.sparklineSection}>
        <h2 className={styles.sectionTitle}>Doanh thu 7 ngày</h2>
        <Sparkline data={sparkline} />
      </section>

      <section className={styles.recentSection}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Đơn hàng gần đây</h2>
          <Link href="/admin/orders" className={shared.btnGhost}>Tất cả <ArrowRight size={14}/></Link>
        </div>
        {recent.length === 0 ? (
          <div className={shared.emptyState}>
            <div className={shared.emptyIcon}><Package size={24}/></div>
            <p className={shared.emptyTitle}>Chưa có đơn hàng</p>
          </div>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead><tr>
                <th>Mã</th><th>Khách</th><th>Tổng</th><th>Trạng thái</th><th>Lúc</th>
              </tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>{o.code}</td>
                    <td>{o.customer_name}</td>
                    <td>{formatVND(o.total_amount)}</td>
                    <td><span className={`${shared.badge} ${shared[ORDER_STATUS_BADGE[o.status] ?? 'badgeMuted']}`}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</span></td>
                    <td>{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create `RangeSwitch.tsx`**

```tsx
// apps/web/src/app/(backoffice)/admin/_components/RangeSwitch.tsx
'use client';
import { useRouter, usePathname } from 'next/navigation';
import shared from '../admin-shared.module.css';
import type { DashboardRange } from '@/lib/admin/queries/dashboard';

const OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
];

export function RangeSwitch({ current }: { current: DashboardRange }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className={shared.filterBar} role="tablist">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={opt.value === current}
          className={`${shared.filterChip} ${opt.value === current ? shared.filterChipActive : ''}`}
          onClick={() => router.push(`${pathname}?range=${opt.value}`)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `Sparkline.tsx`**

```tsx
// apps/web/src/app/(backoffice)/admin/_components/Sparkline.tsx
'use client';
import { formatVND } from '@/lib/admin/format';

type Point = { date: string; total: number };

export function Sparkline({ data }: { data: Point[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const w = 600;
  const h = 120;
  const stepX = w / Math.max(data.length - 1, 1);
  const points = data
    .map((d, i) => `${i * stepX},${h - (d.total / max) * (h - 16) - 4}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Biểu đồ doanh thu 7 ngày">
      <polyline fill="none" stroke="var(--vg-leaf-700)" strokeWidth={2} points={points} />
      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={i * stepX} cy={h - (d.total / max) * (h - 16) - 4} r={3} fill="var(--vg-leaf-700)" />
          <title>{`${d.date}: ${formatVND(d.total)}`}</title>
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 4: Update `admin-page.module.css` to define `sectionTitle`, `sectionHead`, `recentSection`, `sparklineSection`**

Open `apps/web/src/app/(backoffice)/admin/admin-page.module.css`. Replace the file with minimal styles using tokens:

```css
.sectionTitle {
  font-family: var(--vg-font-display);
  font-size: var(--vg-text-lg);
  margin: 0 0 var(--vg-space-3);
  color: var(--vg-ink-900);
}
.sectionHead {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: var(--vg-space-3);
}
.sparklineSection, .recentSection {
  background: var(--vg-glass-bg);
  border: 1px solid var(--vg-glass-border);
  border-radius: var(--vg-radius-lg);
  padding: var(--vg-space-5);
  box-shadow: var(--vg-shadow-1);
  margin-bottom: var(--vg-space-5);
}
```

- [ ] **Step 5: Verify**

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
npm run dev
```
Open `/admin?range=7d`. KPIs render, range switch reloads with new range, sparkline shows, recent orders list loads. Mobile 375 viewport ok.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(backoffice\)/admin/page.tsx apps/web/src/app/\(backoffice\)/admin/_components/ apps/web/src/app/\(backoffice\)/admin/admin-page.module.css
git commit -m "feat(admin): convert dashboard to Server Component with sparkline"
```

---

## Task 9: Orders List

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/orders/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/orders/_components/OrdersFilters.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/orders/_components/OrderRow.tsx` (client, has actions)

**Goal:** Convert orders to Server Component, search + status filter via URL params, row actions trigger server action `updateOrderStatus`.

- [ ] **Step 1: Implement `listOrders` in `lib/admin/queries/orders.ts`**

```ts
import { createClient } from '@/lib/supabase/server';

export type OrderListFilters = {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
};

export async function listOrders(filters: OrderListFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from('orders')
    .select('id, code, customer_name, phone, total_amount, status, payment_method, created_at, address, city')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filters.q) {
    query = query.or(`code.ilike.%${filters.q}%,customer_name.ilike.%${filters.q}%,phone.ilike.%${filters.q}%`);
  }
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.from)   query = query.gte('created_at', filters.from);
  if (filters.to)     query = query.lte('created_at', filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getOrder(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Replace `orders/page.tsx` with Server Component**

```tsx
// apps/web/src/app/(backoffice)/admin/orders/page.tsx
import { listOrders, type OrderListFilters } from '@/lib/admin/queries/orders';
import { formatVND, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from '@/lib/admin/format';
import shared from '../admin-shared.module.css';
import { OrdersFilters } from './_components/OrdersFilters';
import { OrderRow } from './_components/OrderRow';
import { Package } from 'lucide-react';

type Props = { searchParams: Promise<OrderListFilters> };

export default async function AdminOrders({ searchParams }: Props) {
  const filters = await searchParams;
  const orders = await listOrders(filters);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Đơn hàng</h1>
          <p className={shared.pageSubtitle}>{orders.length} đơn</p>
        </div>
      </div>

      <OrdersFilters defaults={filters} />

      {orders.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}><Package size={24}/></div>
          <p className={shared.emptyTitle}>Không có đơn hàng phù hợp</p>
        </div>
      ) : (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead><tr>
              <th>Mã</th><th>Khách</th><th>SĐT</th><th>Tổng</th><th>Trạng thái</th><th>Thanh toán</th><th>Lúc</th><th></th>
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `OrdersFilters.tsx`**

```tsx
// apps/web/src/app/(backoffice)/admin/orders/_components/OrdersFilters.tsx
'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import shared from '../../admin-shared.module.css';
import { ORDER_STATUS_LABEL } from '@/lib/admin/format';
import type { OrderListFilters } from '@/lib/admin/queries/orders';

const STATUS_OPTIONS: (keyof typeof ORDER_STATUS_LABEL)[] = ['pending','confirmed','shipping','completed','cancelled'];

export function OrdersFilters({ defaults }: { defaults: OrderListFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(sp.toString());
    if (!value) next.delete(key); else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className={shared.toolbar}>
      <div className={shared.filterBar}>
        <div className={shared.searchInput}>
          <Search size={16} />
          <input
            placeholder="Tìm theo mã / tên / SĐT"
            defaultValue={defaults.q ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParam('q', (e.target as HTMLInputElement).value || undefined);
            }}
          />
        </div>
        <button className={`${shared.filterChip} ${!defaults.status ? shared.filterChipActive : ''}`} onClick={() => setParam('status', undefined)}>Tất cả</button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            className={`${shared.filterChip} ${defaults.status === s ? shared.filterChipActive : ''}`}
            onClick={() => setParam('status', s)}
          >
            {ORDER_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `OrderRow.tsx`**

```tsx
// apps/web/src/app/(backoffice)/admin/orders/_components/OrderRow.tsx
'use client';
import { useTransition } from 'react';
import { Eye, CheckCircle, Truck, XCircle, Loader2 } from 'lucide-react';
import { updateOrderStatus } from '@/app/actions/admin/orders';
import { formatVND, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';

type OrderRowData = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
};

export function OrderRow({ order }: { order: OrderRowData }) {
  const [pending, start] = useTransition();
  function setStatus(next: 'confirmed'|'shipping'|'completed'|'cancelled') {
    start(async () => { await updateOrderStatus(order.id, next); });
  }

  return (
    <tr>
      <td><strong>{order.code}</strong></td>
      <td>{order.customer_name}</td>
      <td>{order.phone}</td>
      <td>{formatVND(order.total_amount)}</td>
      <td><span className={`${shared.badge} ${shared[ORDER_STATUS_BADGE[order.status] ?? 'badgeMuted']}`}>{ORDER_STATUS_LABEL[order.status]}</span></td>
      <td>{order.payment_method.toUpperCase()}</td>
      <td>{formatDate(order.created_at)}</td>
      <td>
        <a href={`/admin/orders/${order.id}`} className={`${shared.btn} ${shared.btnGhost}`} aria-label="Xem"><Eye size={14}/></a>
        {order.status === 'pending' && (
          <button onClick={() => setStatus('confirmed')} disabled={pending} className={`${shared.btn} ${shared.btnGhost}`} aria-label="Xác nhận">
            {pending ? <Loader2 size={14} className="spin"/> : <CheckCircle size={14}/>}
          </button>
        )}
        {order.status === 'confirmed' && (
          <button onClick={() => setStatus('shipping')} disabled={pending} className={`${shared.btn} ${shared.btnGhost}`} aria-label="Giao hàng"><Truck size={14}/></button>
        )}
        {(order.status === 'pending' || order.status === 'confirmed') && (
          <button onClick={() => setStatus('cancelled')} disabled={pending} className={`${shared.btn} ${shared.btnGhost}`} aria-label="Hủy"><XCircle size={14}/></button>
        )}
      </td>
    </tr>
  );
}
```

- [ ] **Step 5: Verify**

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
npm run dev
```
Test: `/admin/orders` lists. Search input + Enter filters. Status chips filter. Row action transitions status, table refreshes via `revalidatePath`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(backoffice\)/admin/orders/ apps/web/src/lib/admin/queries/orders.ts
git commit -m "feat(admin): convert orders list to Server Component with URL filters"
```

---

## Task 10: Order Detail Page

**Files:**
- Create: `apps/web/src/app/(backoffice)/admin/orders/[id]/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/orders/[id]/order-detail.module.css`

**Goal:** Dedicated order detail Server Component (replaces in-list modal). Shows customer info, address, items table, status timeline, action buttons.

- [ ] **Step 1: Create page**

```tsx
// apps/web/src/app/(backoffice)/admin/orders/[id]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getOrder } from '@/lib/admin/queries/orders';
import { formatVND, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';
import styles from './order-detail.module.css';
import { OrderActions } from '../_components/OrderActions';

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  type OrderItem = {
    id: string;
    product_name: string;
    product_image: string | null;
    unit_price: number;
    quantity: number;
  };
  const items = (order.items ?? []) as OrderItem[];

  return (
    <div className={shared.page}>
      <Link href="/admin/orders" className={`${shared.btn} ${shared.btnGhost}`}>
        <ChevronLeft size={14}/> Quay lại
      </Link>

      <div className={shared.pageHeader} style={{ marginTop: 12 }}>
        <div>
          <h1 className={shared.pageTitle}>{order.code}</h1>
          <p className={shared.pageSubtitle}>{formatDate(order.created_at)}</p>
        </div>
        <span className={`${shared.badge} ${shared[ORDER_STATUS_BADGE[order.status] ?? 'badgeMuted']}`}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Khách hàng</h3>
          <div><strong>{order.customer_name}</strong></div>
          <div>{order.phone}</div>
          <div>{order.address}, {order.city}</div>
          <div>Thanh toán: {order.payment_method.toUpperCase()}</div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Hành động</h3>
          <OrderActions id={order.id} status={order.status} />
        </section>
      </div>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Sản phẩm</h3>
        <table className={shared.table}>
          <thead><tr><th>Tên</th><th>SL</th><th>Đơn giá</th><th>Tạm tính</th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.product_name}</td>
                <td>{it.quantity}</td>
                <td>{formatVND(it.unit_price)}</td>
                <td>{formatVND(it.unit_price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={3} style={{ textAlign: 'right' }}><strong>Tổng</strong></td><td><strong>{formatVND(order.total_amount)}</strong></td></tr></tfoot>
        </table>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create `OrderActions.tsx`**

```tsx
// apps/web/src/app/(backoffice)/admin/orders/_components/OrderActions.tsx
'use client';
import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { updateOrderStatus } from '@/app/actions/admin/orders';
import shared from '../../admin-shared.module.css';

const NEXT: Record<string, ('confirmed'|'shipping'|'completed'|'cancelled')[]> = {
  pending:   ['confirmed','cancelled'],
  confirmed: ['shipping','cancelled'],
  shipping:  ['completed'],
  completed: [],
  cancelled: [],
};
const LABEL: Record<string, string> = {
  confirmed: 'Xác nhận', shipping: 'Bắt đầu giao', completed: 'Hoàn thành', cancelled: 'Hủy đơn',
};

export function OrderActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const choices = NEXT[status] ?? [];

  if (choices.length === 0) return <p>Đã chốt trạng thái cuối.</p>;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {choices.map((next) => (
        <button
          key={next}
          disabled={pending}
          className={`${shared.btn} ${next === 'cancelled' ? shared.btnDanger : shared.btnPrimary}`}
          onClick={() => start(async () => { await updateOrderStatus(id, next); })}
        >
          {pending ? <Loader2 size={14}/> : null} {LABEL[next]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `order-detail.module.css`**

```css
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--vg-space-4); margin-bottom: var(--vg-space-5); }
.card {
  background: var(--vg-glass-bg);
  border: 1px solid var(--vg-glass-border);
  border-radius: var(--vg-radius-lg);
  padding: var(--vg-space-5);
  box-shadow: var(--vg-shadow-1);
  margin-bottom: var(--vg-space-4);
}
.cardTitle {
  font-family: var(--vg-font-display);
  font-size: var(--vg-text-lg);
  margin: 0 0 var(--vg-space-3);
  color: var(--vg-ink-900);
}
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 4: Verify**

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
npm run dev
```
Open `/admin/orders/<id>`. Detail loads, action buttons advance status, page revalidates.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(backoffice\)/admin/orders/\[id\]/ apps/web/src/app/\(backoffice\)/admin/orders/_components/OrderActions.tsx
git commit -m "feat(admin): add order detail page with status timeline actions"
```

---

## Task 11: Products List

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/products/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/products/_components/ProductFilters.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/products/_components/ProductCard.tsx`

**Goal:** Convert products to Server Component grid view, search + category filter via URL, card with edit link.

- [ ] **Step 1: Implement `listProducts` in queries**

```ts
// apps/web/src/lib/admin/queries/products.ts (add to existing module)
export type ProductListFilters = { q?: string; category?: string; stock?: 'in'|'low'|'out' };

export async function listProducts(filters: ProductListFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from('products')
    .select('id, name, slug, price, stock, image, is_active, rating, reviews_count, category:categories(id,name,slug)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filters.q) query = query.ilike('name', `%${filters.q}%`);
  if (filters.category) query = query.eq('category_id', filters.category);
  if (filters.stock === 'out') query = query.eq('stock', 0);
  if (filters.stock === 'low') query = query.gt('stock', 0).lt('stock', 5);
  if (filters.stock === 'in')  query = query.gte('stock', 5);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listAllCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from('categories').select('id, name, slug').order('name');
  return data ?? [];
}
```

- [ ] **Step 2: Replace `products/page.tsx`**

```tsx
import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import { listProducts, listAllCategories, type ProductListFilters } from '@/lib/admin/queries/products';
import shared from '../admin-shared.module.css';
import { ProductFilters } from './_components/ProductFilters';
import { ProductCard } from './_components/ProductCard';

type Props = { searchParams: Promise<ProductListFilters> };

export default async function AdminProducts({ searchParams }: Props) {
  const filters = await searchParams;
  const [products, categories] = await Promise.all([listProducts(filters), listAllCategories()]);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Sản phẩm</h1>
          <p className={shared.pageSubtitle}>{products.length} sản phẩm</p>
        </div>
        <Link href="/admin/products/new" className={`${shared.btn} ${shared.btnPrimary}`}>
          <Plus size={14}/> Thêm sản phẩm
        </Link>
      </div>

      <ProductFilters defaults={filters} categories={categories} />

      {products.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}><Package size={24}/></div>
          <p className={shared.emptyTitle}>Chưa có sản phẩm</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `ProductFilters.tsx` and `ProductCard.tsx`**

`ProductFilters.tsx`: same pattern as `OrdersFilters` — search input + category select (using `categories` prop) + stock chips. Sets URL params.

`ProductCard.tsx`: server component card with `SafeImage`, name, category, formatted VND price, stock badge (>=5 success, 1-4 warn, 0 danger), "Sửa" link to `/admin/products/[id]`.

- [ ] **Step 4: Verify + commit**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
npm run dev
```
Open `/admin/products?q=tinh&stock=in`. Filters work.

```bash
git add apps/web/src/app/\(backoffice\)/admin/products/ apps/web/src/lib/admin/queries/products.ts
git commit -m "feat(admin): convert products list to Server Component with grid view"
```

---

## Task 12: Product Upsert Form

**Files:**
- Create: `apps/web/src/app/(backoffice)/admin/products/new/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/products/[id]/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/products/_components/ProductForm.tsx`

**Goal:** Server Component edit page wraps client form. Form uses `useFormState` with server action `upsertProduct`. Image upload via `uploadAdminImage`.

- [ ] **Step 1: Implement `getProduct` and server action**

In `lib/admin/queries/products.ts`:

```ts
export async function getProduct(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, category_id, image, description, ingredients, stock, is_active')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
```

In `app/actions/admin/products.ts`:

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type ProductInput = {
  id?: string;
  name: string; slug: string; price: number; category_id: string;
  image: string; description: string; ingredients: string; stock: number; is_active: boolean;
};

export async function upsertProduct(input: ProductInput) {
  const supabase = await createClient();
  if (input.id) {
    const { error } = await supabase.from('products').update(input).eq('id', input.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from('products').insert(input);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath('/admin/products');
  return { ok: true as const };
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/products');
  return { ok: true as const };
}
```

- [ ] **Step 2: Create `new/page.tsx` and `[id]/page.tsx`**

`new/page.tsx`:
```tsx
import { listAllCategories } from '@/lib/admin/queries/products';
import { ProductForm } from '../_components/ProductForm';
import shared from '../../admin-shared.module.css';

export default async function NewProductPage() {
  const categories = await listAllCategories();
  return (
    <div className={shared.page}>
      <h1 className={shared.pageTitle}>Sản phẩm mới</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
```

`[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { getProduct, listAllCategories } from '@/lib/admin/queries/products';
import { ProductForm } from '../_components/ProductForm';
import shared from '../../admin-shared.module.css';

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), listAllCategories()]);
  if (!product) notFound();
  return (
    <div className={shared.page}>
      <h1 className={shared.pageTitle}>Sửa sản phẩm</h1>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
```

- [ ] **Step 3: Create `ProductForm.tsx`**

```tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { upsertProduct, deleteProduct } from '@/app/actions/admin/products';
import { uploadAdminImage } from '@/lib/admin/storage';
import shared from '../../admin-shared.module.css';

type Category = { id: string; name: string };
type Product = {
  id: string; name: string; slug: string; price: number; category_id: string;
  image: string; description: string; ingredients: string; stock: number; is_active: boolean;
};

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Product>(product ?? {
    id: '', name: '', slug: '', price: 0, category_id: categories[0]?.id ?? '',
    image: '', description: '', ingredients: '', stock: 0, is_active: true,
  });
  const [uploading, setUploading] = useState(false);

  async function handleImage(file: File | null) {
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const { url } = await uploadAdminImage('productImages', file);
      setForm((f) => ({ ...f, image: url }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi upload');
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    setError(null);
    start(async () => {
      const payload = product?.id ? { ...form, id: product.id } : { ...form };
      const res = await upsertProduct(payload);
      if (!res.ok) setError(res.error);
      else router.push('/admin/products');
    });
  }

  function remove() {
    if (!product?.id) return;
    if (!confirm('Xóa sản phẩm này?')) return;
    start(async () => {
      const res = await deleteProduct(product.id);
      if (res.ok) router.push('/admin/products');
    });
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      style={{ maxWidth: 720, marginTop: 24 }}
    >
      <div className={shared.formField}>
        <label className={shared.formLabel}>Ảnh</label>
        {form.image && <img src={form.image} alt="preview" style={{ maxWidth: 200, borderRadius: 12 }} />}
        <label className={`${shared.btn} ${shared.btnSecondary}`} style={{ width: 'fit-content' }}>
          <Upload size={14}/> {uploading ? 'Đang tải...' : 'Tải ảnh'}
          <input type="file" accept="image/*" hidden onChange={(e) => handleImage(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <div className={shared.formRow}>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Tên</label>
          <input className={shared.formInput} value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, '-') }))} required />
        </div>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Slug</label>
          <input className={shared.formInput} value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required />
        </div>
      </div>

      <div className={shared.formRow}>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Giá (VND)</label>
          <input type="number" className={shared.formInput} value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} required min={0} />
        </div>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Tồn kho</label>
          <input type="number" className={shared.formInput} value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} min={0} />
        </div>
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>Danh mục</label>
        <select className={shared.formSelect} value={form.category_id}
          onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>Mô tả</label>
        <textarea className={shared.formTextarea} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>Thành phần</label>
        <textarea className={shared.formTextarea} value={form.ingredients} onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))} />
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Hiển thị
        </label>
      </div>

      {error && <p className={shared.formError}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className={`${shared.btn} ${shared.btnPrimary}`} disabled={pending}>
          {pending ? <Loader2 size={14}/> : null} Lưu
        </button>
        {product?.id && (
          <button type="button" onClick={remove} className={`${shared.btn} ${shared.btnDanger}`}>
            <Trash2 size={14}/> Xóa
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
npm run dev
```
Test: create new product, edit existing, upload image, delete with confirm. (Image upload requires `product-images` bucket — if missing, see Task 11 audit notes; create bucket via Supabase CLI or migration.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(backoffice\)/admin/products/ apps/web/src/app/actions/admin/products.ts
git commit -m "feat(admin): product upsert form with image upload"
```

---

## Task 13: Categories CRUD

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/categories/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/categories/_components/CategoryFormModal.tsx`

**Goal:** Server Component list. Inline modal-based create/rename/delete via server actions.

- [ ] **Step 1: Queries + actions**

In `lib/admin/queries/categories.ts`:

```ts
import { createClient } from '@/lib/supabase/server';

export async function listCategoriesWithCounts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, created_at, products(count)')
    .order('name');
  return (data ?? []).map((c: { id: string; name: string; slug: string; created_at: string; products: { count: number }[] }) => ({
    id: c.id, name: c.name, slug: c.slug, created_at: c.created_at,
    product_count: c.products?.[0]?.count ?? 0,
  }));
}
```

In `app/actions/admin/categories.ts`: `upsertCategory({ id?, name, slug })` and `deleteCategory(id)` with revalidatePath.

- [ ] **Step 2: page + modal**

Same pattern as products: Server Component fetches list, Client `CategoryFormModal` handles create/edit, delete row triggers `confirm()` then server action.

- [ ] **Step 3: Verify + commit**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
git add apps/web/src/app/\(backoffice\)/admin/categories/ apps/web/src/lib/admin/queries/categories.ts apps/web/src/app/actions/admin/categories.ts
git commit -m "feat(admin): categories CRUD with modal form"
```

---

## Task 14: Customers

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/customers/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/customers/[id]/page.tsx`

**Goal:** Customer list (Server Component, search by name/phone). Detail page shows profile + addresses + orders history + voucher usage.

- [ ] **Step 1: Queries**

`lib/admin/queries/customers.ts`:

```ts
import { createClient } from '@/lib/supabase/server';

export type CustomerListFilters = { q?: string };

export async function listCustomers(filters: CustomerListFilters = {}) {
  const supabase = await createClient();
  let q = supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, created_at, phone:addresses(phone)', { count: 'exact' })
    .eq('role', 'customer')
    .limit(200);
  if (filters.q) q = q.ilike('full_name', `%${filters.q}%`);
  const { data } = await q;
  return data ?? [];
}

export async function getCustomerDetail(id: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: addresses }, { data: orders }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('addresses').select('*').eq('user_id', id),
    supabase.from('orders').select('id, code, total_amount, status, created_at').eq('user_id', id).order('created_at', { ascending: false }),
  ]);
  return { profile, addresses: addresses ?? [], orders: orders ?? [] };
}
```

- [ ] **Step 2: List + detail pages**

Standard Server Component pattern. List page mirrors orders/products. Detail page shows three sections (profile / addresses / orders) using `shared.tableWrap`.

- [ ] **Step 3: Verify + commit**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
git add apps/web/src/app/\(backoffice\)/admin/customers/ apps/web/src/lib/admin/queries/customers.ts
git commit -m "feat(admin): customers list + detail with orders history"
```

---

## Task 15: Users (staff)

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/users/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/users/_components/InviteStaffModal.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/users/_components/StaffRow.tsx`

**Goal:** Server Component list + Client invite modal + row actions. Reuses existing `inviteStaff` server action where possible.

- [ ] **Step 1: Read existing `inviteStaff` action**

```bash
cat apps/web/src/app/actions/staff.ts
```
Audit: does it cover inviteStaff + toggleStatus? If yes reuse. If only invite, add `toggleStaffStatus(id)` to `app/actions/admin/profile.ts` (or new `app/actions/admin/staff.ts`).

- [ ] **Step 2: Queries**

`lib/admin/queries/staff.ts`:

```ts
import { createClient } from '@/lib/supabase/server';

export async function listStaff() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('staff_profiles')
    .select('id, full_name, email, department, position, is_active, created_at, role:roles(id, name, display_name)')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function listInvitations() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('staff_invitations')
    .select('id, email, full_name, status, invited_at, role:roles(display_name)')
    .order('invited_at', { ascending: false });
  return data ?? [];
}

export async function listRoles() {
  const supabase = await createClient();
  const { data } = await supabase.from('roles').select('id, name, display_name').order('display_name');
  return data ?? [];
}
```

- [ ] **Step 3: page + modal**

Server Component lists staff + invitations. Modal client subcomponent calls `inviteStaff` action. Row toggle action calls `toggleStaffStatus`.

- [ ] **Step 4: Verify + commit**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
git add apps/web/src/app/\(backoffice\)/admin/users/ apps/web/src/lib/admin/queries/staff.ts
git commit -m "feat(admin): convert staff users to Server Component"
```

---

## Task 16: Roles & Permission Matrix

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/roles/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/roles/_components/PermissionMatrix.tsx`

**Goal:** **Remove the hardcoded `PERMISSIONS[]` array.** Fetch real permissions from DB. Render checkbox matrix; per-role save via `setRolePermissions` action.

- [ ] **Step 1: Replace `roles/page.tsx`**

```tsx
import { listRoles, listPermissions } from '@/lib/admin/queries/roles';
import { PermissionMatrix } from './_components/PermissionMatrix';
import shared from '../admin-shared.module.css';

export default async function AdminRoles() {
  const [roles, permissions] = await Promise.all([listRoles(), listPermissions()]);

  // For each role pre-load its permission ids
  const rolesWithPerms = await Promise.all(
    roles.map(async (r) => {
      const { getRolePermissions } = await import('@/lib/admin/queries/roles');
      return { ...r, permissionIds: await getRolePermissions(r.id) };
    }),
  );

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>Vai trò & quyền</h1>
      </div>
      <PermissionMatrix roles={rolesWithPerms} permissions={permissions} />
    </div>
  );
}
```

- [ ] **Step 2: Create `PermissionMatrix.tsx`**

Client component. Render a table where rows = permissions (grouped by `module`), cols = roles, cells = checkboxes. State per role tracks dirty checkboxes. "Lưu" button per role calls `setRolePermissions(roleId, ids[])` action.

```tsx
'use client';
import { useState, useTransition } from 'react';
import { Loader2, Save } from 'lucide-react';
import { setRolePermissions } from '@/app/actions/admin/roles';
import shared from '../../admin-shared.module.css';

type Permission = { id: string; module: string; action: string; description: string };
type RoleWithPerms = { id: string; name: string; display_name: string; permissionIds: string[] };

export function PermissionMatrix({ roles, permissions }: { roles: RoleWithPerms[]; permissions: Permission[] }) {
  const [state, setState] = useState<Record<string, Set<string>>>(
    () => Object.fromEntries(roles.map((r) => [r.id, new Set(r.permissionIds)]))
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  function toggle(roleId: string, permId: string) {
    setState((s) => {
      const next = new Set(s[roleId]);
      if (next.has(permId)) next.delete(permId); else next.add(permId);
      return { ...s, [roleId]: next };
    });
  }

  function save(roleId: string) {
    setPendingId(roleId);
    start(async () => {
      await setRolePermissions(roleId, Array.from(state[roleId]));
      setPendingId(null);
    });
  }

  // group permissions by module
  const byModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className={shared.tableWrap}>
      <table className={shared.table}>
        <thead><tr>
          <th>Quyền</th>
          {roles.map((r) => <th key={r.id}>{r.display_name}</th>)}
        </tr></thead>
        <tbody>
          {Object.entries(byModule).map(([module, perms]) => (
            <>
              <tr key={module}><td colSpan={1 + roles.length}><strong>{module}</strong></td></tr>
              {perms.map((p) => (
                <tr key={p.id}>
                  <td>{p.description || `${p.module}:${p.action}`}</td>
                  {roles.map((r) => (
                    <td key={r.id}>
                      <input type="checkbox"
                        checked={state[r.id].has(p.id)}
                        disabled={r.name === 'super_admin'}
                        onChange={() => toggle(r.id, p.id)} />
                    </td>
                  ))}
                </tr>
              ))}
            </>
          ))}
          <tr>
            <td>Lưu</td>
            {roles.map((r) => (
              <td key={r.id}>
                <button
                  className={`${shared.btn} ${shared.btnPrimary}`}
                  disabled={r.name === 'super_admin' || pendingId === r.id}
                  onClick={() => save(r.id)}
                >
                  {pendingId === r.id ? <Loader2 size={14}/> : <Save size={14}/>}
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
npm run dev
```
Toggle a checkbox, click save, refresh page → state persisted. Old hardcoded PERMISSIONS array no longer in code (`grep "const PERMISSIONS" apps/web/src/app/\(backoffice\)/admin/roles/page.tsx` returns nothing).

```bash
git add apps/web/src/app/\(backoffice\)/admin/roles/ apps/web/src/lib/admin/queries/roles.ts apps/web/src/app/actions/admin/roles.ts
git commit -m "feat(admin): real permission matrix from DB, remove hardcoded PERMISSIONS"
```

---

## Task 17: Marketing — Vouchers Tab

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/marketing/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/marketing/_components/VouchersTab.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/marketing/_components/VoucherFormModal.tsx`

**Goal:** Server Component shell with tab switching via URL `?tab=vouchers`. Vouchers tab lists from DB with create/edit modal.

- [ ] **Step 1: Queries + action**

`lib/admin/queries/marketing.ts`:

```ts
export async function listVouchers() {
  const supabase = await createClient();
  const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
  return data ?? [];
}
```

`app/actions/admin/marketing.ts`: `upsertVoucher`, `deleteVoucher` actions.

- [ ] **Step 2: Page shell**

```tsx
import shared from '../admin-shared.module.css';
import { VouchersTab } from './_components/VouchersTab';
// import BannersTab, FlashTab in later tasks
import Link from 'next/link';

type Tab = 'vouchers' | 'banners' | 'flash';
type Props = { searchParams: Promise<{ tab?: Tab }> };

export default async function AdminMarketing({ searchParams }: Props) {
  const { tab = 'vouchers' } = await searchParams;
  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>Marketing</h1>
      </div>
      <div className={shared.tabBar}>
        <Link href="?tab=vouchers" className={`${shared.tabBtn} ${tab === 'vouchers' ? shared.tabBtnActive : ''}`}>Voucher</Link>
        <Link href="?tab=banners" className={`${shared.tabBtn} ${tab === 'banners' ? shared.tabBtnActive : ''}`}>Banner</Link>
        <Link href="?tab=flash" className={`${shared.tabBtn} ${tab === 'flash' ? shared.tabBtnActive : ''}`}>Flash sale</Link>
      </div>
      {tab === 'vouchers' && <VouchersTab />}
      {tab === 'banners'  && <p>Bookmark — Task 18</p>}
      {tab === 'flash'    && <p>Bookmark — Task 19</p>}
    </div>
  );
}
```

- [ ] **Step 3: `VouchersTab.tsx`**

Server Component (async function). Fetches `listVouchers`. Renders table with status badges, action buttons (open `VoucherFormModal` client component for create/edit). Modal handles all 3 discount types: `percent`, `fixed`, `shipping`.

- [ ] **Step 4: Verify + commit**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
git add apps/web/src/app/\(backoffice\)/admin/marketing/ apps/web/src/lib/admin/queries/marketing.ts apps/web/src/app/actions/admin/marketing.ts
git commit -m "feat(admin): marketing shell + vouchers tab"
```

---

## Task 18: Marketing — Banners Tab

**Files:**
- Create: `apps/web/src/app/(backoffice)/admin/marketing/_components/BannersTab.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/marketing/_components/BannerFormModal.tsx`

**Goal:** Banner CRUD with image upload + placement select. Reuse `uploadAdminImage('bannerImages', file)`.

- [ ] **Step 1: Queries + action**

Add to `marketing.ts` queries: `listBanners()`. Add action `upsertBanner`, `deleteBanner`.

- [ ] **Step 2: BannersTab**

Server Component grid view. Card per banner shows preview image + title + status + placement. Action: edit (open modal), delete (confirm).

- [ ] **Step 3: BannerFormModal**

Client form with: title, subtitle, image upload, cover_gradient (optional), link_url, placement select (`home_hero`, `home_sub`, `blog_index`, `category_top`), period (starts_at, expires_at), status (active/scheduled/expired/draft).

- [ ] **Step 4: Wire into marketing page**

Replace `<p>Bookmark — Task 18</p>` with `<BannersTab />`.

- [ ] **Step 5: Verify + commit**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
git add apps/web/src/app/\(backoffice\)/admin/marketing/_components/Banners* apps/web/src/lib/admin/queries/marketing.ts apps/web/src/app/actions/admin/marketing.ts apps/web/src/app/\(backoffice\)/admin/marketing/page.tsx
git commit -m "feat(admin): banners tab with upload and placement"
```

---

## Task 19: Marketing — Flash Sale Tab

**Files:**
- Create: `apps/web/src/app/(backoffice)/admin/marketing/_components/FlashTab.tsx`
- Conditional create: `apps/backend/supabase/migrations/00011_flash_sales.sql`

**Goal:** Flash sale CRUD. **Branches based on Task 0 audit.**

- [ ] **Step 1: Branch on audit result**

If Task 0 found `flash_sales` table missing, create migration `00011_flash_sales.sql`:

```sql
-- VeganGlow Flash sales — limited-time product discounts
create table if not exists public.flash_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent < 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'scheduled' check (status in ('scheduled','active','expired','draft')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index if not exists flash_sales_product_idx on public.flash_sales(product_id);
create index if not exists flash_sales_period_idx on public.flash_sales(starts_at, ends_at);
alter table public.flash_sales enable row level security;
drop policy if exists flash_sales_read on public.flash_sales;
create policy flash_sales_read on public.flash_sales for select using (true);
drop policy if exists flash_sales_write on public.flash_sales;
create policy flash_sales_write on public.flash_sales for all using (public.is_admin()) with check (public.is_admin());
```

Then run `npm run db:push` and `npm run db:types`.

If table exists, skip migration step.

- [ ] **Step 2: Queries + action**

Add `listFlashSales()` query and `upsertFlashSale`, `deleteFlashSale` actions.

- [ ] **Step 3: FlashTab**

Server Component lists current + scheduled. Client form modal: select product (from `listProducts({})`), discount percent, starts_at, ends_at, status.

- [ ] **Step 4: Wire into marketing page**

Replace `<p>Bookmark — Task 19</p>` with `<FlashTab />`.

- [ ] **Step 5: Verify + commit**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
git add apps/backend/supabase/migrations/00011_flash_sales.sql apps/web/src/app/\(backoffice\)/admin/marketing/ apps/web/src/lib/admin/queries/marketing.ts apps/web/src/app/actions/admin/marketing.ts apps/web/src/types/database.ts
git commit -m "feat(admin): flash sale tab with optional schema migration"
```

---

## Task 20: Profile (staff own)

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/profile/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/profile/_components/ProfileForm.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/profile/_components/ActivityFeed.tsx`

**Goal:** Server Component fetches current staff profile + audit log entries. Client form for edit. ActivityFeed shows last 50 audit entries by current user.

- [ ] **Step 1: Queries**

In `lib/admin/queries/audit.ts`:

```ts
export async function listMyAuditEntries(limit = 50) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('audit_log')
    .select('id, module, action, target_id, summary, created_at')
    .eq('actor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
```

In `lib/admin/queries/staff.ts`:

```ts
export async function getMyStaffProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('staff_profiles')
    .select('id, full_name, first_name, last_name, username, email, department, position, bio, avatar_url, role:roles(display_name)')
    .eq('id', user.id)
    .maybeSingle();
  return data;
}
```

- [ ] **Step 2: Action**

In `app/actions/admin/profile.ts`:

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type StaffEdit = {
  full_name: string; first_name?: string; last_name?: string;
  username?: string; department?: string; position?: string; bio?: string;
};

export async function updateMyStaffProfile(input: StaffEdit) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Chưa đăng nhập' };
  const { error } = await supabase.from('staff_profiles').update(input).eq('id', user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/profile');
  return { ok: true as const };
}
```

- [ ] **Step 3: page + components**

Page Server Component composes `ProfileForm` (Client) + `ActivityFeed` (Server) side by side.

- [ ] **Step 4: Verify + commit**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
git add apps/web/src/app/\(backoffice\)/admin/profile/ apps/web/src/lib/admin/queries/audit.ts apps/web/src/lib/admin/queries/staff.ts apps/web/src/app/actions/admin/profile.ts
git commit -m "feat(admin): staff profile with editable info and activity feed"
```

---

## Task 21: Settings

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/settings/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/settings/_components/BrandTab.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/settings/_components/AuditLogTab.tsx`

**Goal:** Tabbed settings page. Brand info from a `system_settings` key-value table (or env-managed if no table). Audit log viewer with filters.

- [ ] **Step 1: Audit existing settings storage**

```bash
grep -E "system_settings|brand_settings" apps/backend/supabase/migrations/*.sql apps/backend/supabase/schema.sql
```

If no table exists, create `00013_system_settings.sql` with key-value pairs:

```sql
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.system_settings enable row level security;
drop policy if exists system_settings_read on public.system_settings;
create policy system_settings_read on public.system_settings for select using (public.is_admin());
drop policy if exists system_settings_write on public.system_settings;
create policy system_settings_write on public.system_settings for all using (public.is_admin()) with check (public.is_admin());
```

Run `npm run db:push` + `npm run db:types`.

- [ ] **Step 2: Queries + action**

Add `getSystemSetting(key)`, `setSystemSetting(key, value)` to a new `lib/admin/queries/settings.ts` and matching action.

- [ ] **Step 3: BrandTab + AuditLogTab + page shell**

Tabbed shell using `?tab=brand|audit` URL param (same pattern as marketing).

`BrandTab`: form for brand name, logo URL, contact email, contact phone. Stored under key `brand_info`.

`AuditLogTab`: list audit entries with filters (module, actor, date range). Pagination via URL `?page=N`.

- [ ] **Step 4: Verify + commit**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
git add apps/web/src/app/\(backoffice\)/admin/settings/ apps/web/src/lib/admin/queries/settings.ts apps/web/src/app/actions/admin/settings.ts apps/backend/supabase/migrations/00013_system_settings.sql
git commit -m "feat(admin): settings page with brand info and audit log viewer"
```

---

## Task 22: About-team

**Files:**
- Modify: `apps/web/src/app/(backoffice)/admin/about-team/page.tsx`
- Create: `apps/web/src/app/(backoffice)/admin/about-team/_components/TeamMemberForm.tsx`
- Conditional create: `apps/backend/supabase/migrations/00012_team_members.sql`

**Goal:** CRUD team members (avatar, name, role, bio, social links, display order). **Branches based on Task 0 audit.**

- [ ] **Step 1: Branch on audit result**

If `team_members` table missing, create migration:

```sql
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role_label text not null,
  bio text not null default '',
  avatar_url text,
  social_facebook text,
  social_instagram text,
  social_linkedin text,
  display_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists team_members_order_idx on public.team_members(display_order);
alter table public.team_members enable row level security;
drop policy if exists team_members_read on public.team_members;
create policy team_members_read on public.team_members for select using (true);
drop policy if exists team_members_write on public.team_members;
create policy team_members_write on public.team_members for all using (public.is_admin()) with check (public.is_admin());
```

Run `npm run db:push` + `npm run db:types`.

- [ ] **Step 2: Queries + actions**

`lib/admin/queries/team.ts`: `listTeamMembers()`. `app/actions/admin/team.ts`: `upsertTeamMember`, `deleteTeamMember`, `reorderTeamMembers(ids[])`.

- [ ] **Step 3: page + form**

Server Component lists members ordered by `display_order`. Client form modal for create/edit. Inline reorder buttons (up/down) call `reorderTeamMembers`.

If existing `about-team/page.tsx` had hardcoded team members, this task replaces them with DB-backed members.

- [ ] **Step 4: Verify + commit**

```bash
npm run lint --workspace=apps/web
npm run type-check --workspace=apps/web
git add apps/web/src/app/\(backoffice\)/admin/about-team/ apps/web/src/lib/admin/queries/team.ts apps/web/src/app/actions/admin/team.ts apps/backend/supabase/migrations/00012_team_members.sql apps/web/src/types/database.ts
git commit -m "feat(admin): about-team CRUD with optional schema migration"
```

---

## Task 23: Final Verification & Mobile Audit

**Files:** none modified

**Goal:** Sweep checks across the whole admin: lint clean, type-check clean, mobile 375 audit, no `any`, no leftover mock arrays.

- [ ] **Step 1: Full lint**

```bash
cd c:/Users/Terrykote/Desktop/MIS/VeganGlow-admin
npm run lint --workspace=apps/web 2>&1 | tee /tmp/lint.log | tail -5
```
Expected: no `error`s. Warnings on storefront-only files OK; warnings on admin files = regress, fix inline.

- [ ] **Step 2: Type-check**

```bash
npm run type-check --workspace=apps/web
```
Expected: 0 errors.

- [ ] **Step 3: No `any` in admin**

```bash
grep -rn ": any\| any\[\]\|<any>" apps/web/src/app/\(backoffice\)/ apps/web/src/lib/admin/ apps/web/src/app/actions/admin/
```
Expected: no output. If any hits, fix the typing.

- [ ] **Step 4: No leftover mock arrays in admin**

```bash
grep -rn "const \w* = \[" apps/web/src/app/\(backoffice\)/admin/ \
  | grep -v ".module.css" \
  | grep -v "STATUS_LABEL\|STATUS_CONFIG\|STATUS_BADGE\|RANGE_LABEL\|SEGMENT_LABEL\|PERMISSION_LABEL\|OPTIONS"
```
Expected: only legit UI constants. **No data lists.** If `roles/page.tsx` still shows the old `PERMISSIONS` array → re-do Task 16.

- [ ] **Step 5: Build production**

```bash
npm run build --workspace=apps/web
```
Expected: build succeeds (Next.js production build with TypeScript pass).

- [ ] **Step 6: Mobile 375 manual audit**

```bash
npm run dev
```
Open Chrome DevTools → Toggle device toolbar → set to 375×812. Visit each route:
- `/admin`
- `/admin/orders`, `/admin/orders/<id>`
- `/admin/products`, `/admin/products/new`
- `/admin/categories`
- `/admin/customers`, `/admin/customers/<id>`
- `/admin/users`
- `/admin/roles`
- `/admin/marketing?tab=vouchers|banners|flash`
- `/admin/profile`
- `/admin/settings?tab=brand|audit`
- `/admin/about-team`

For each: confirm no horizontal scroll, no overlapping elements, sidebar collapses to drawer/hidden, tables wrap to card layout (per `admin-shared.module.css` mobile media query).

Stop dev server.

- [ ] **Step 7: Commit final cleanup**

If any inline fixes were applied during Steps 1-6, commit them:

```bash
git add -A
git commit -m "chore(admin): final lint and mobile cleanups"
```

If nothing changed, skip commit.

- [ ] **Step 8: Push branch**

```bash
git push -u origin feature/admin-page
```

CI runs on the new branch. If CI red, return to relevant task to fix.

---

## Self-Review

**Spec coverage:**
- §3 audit findings → Task 0 ✅
- §4 L1 (tokens, shell) → Tasks 1-5 ✅
- §4 L2 (queries, actions) → Tasks 6-7 ✅
- §4 L3 per-page → Tasks 8-22 ✅
- §5.1 Dashboard → Task 8 ✅
- §5.2 Orders → Tasks 9-10 ✅
- §5.3 Products → Tasks 11-12 ✅
- §5.4 Categories → Task 13 ✅
- §5.5 Customers → Task 14 ✅
- §5.6 Users → Task 15 ✅
- §5.7 Roles → Task 16 ✅ (removes mock PERMISSIONS)
- §5.8 Marketing → Tasks 17-19 ✅
- §5.9 Profile → Task 20 ✅
- §5.10 Settings → Task 21 ✅
- §5.11 About-team → Task 22 ✅
- §5.12 Storage → Task 6 (storage.ts) + Tasks 12, 18 (consumers) ✅
- §6 Constraints → enforced through verify steps in every task ✅
- §7 Acceptance criteria → Task 23 verifies all 9 ✅
- §8 Risk Phone bug mitigation → handled before plan (commit `3ba186f`) ✅
- §10 Schema audit gate → Task 0 ✅, with branches in Tasks 19/22

**Placeholder scan:** No "TBD"/"TODO"/"implement later". Tasks 6 step 4 says "minimal stubs are acceptable" but qualifies "every function body must be implemented" — acceptable as a contract, not a placeholder.

**Type consistency:**
- `DashboardRange`, `DashboardStats`, `RecentOrderRow` defined in Task 6 → reused in Task 8 ✓
- `OrderListFilters` defined in Task 9 step 1 → used in Task 9 step 2 ✓
- `ProductListFilters` defined in Task 11 → used in Task 11/12 ✓
- `setRolePermissions` signature consistent between Task 7 and Task 16 ✓
- `uploadAdminImage('productImages', ...)` and `('bannerImages', ...)` keys match `ADMIN_BUCKETS` from Task 6 ✓
- `updateOrderStatus(id, status)` signature consistent across Tasks 7, 9, 10 ✓

Plan is consistent. Ready for execution.
