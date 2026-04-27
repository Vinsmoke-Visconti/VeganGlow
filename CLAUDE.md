# CLAUDE.md — VEGANGLOW Project Rules & Standards

Comprehensive guidelines for development on the **VeganGlow** (Mỹ phẩm thuần chay Việt Nam) monorepo.

---

## 🤖 Behavioral Guidelines (Think Before Coding)

**Tradeoff:** Bias toward caution over speed.

- **Don't assume.** State assumptions explicitly. If uncertain, ask.
- **Surface tradeoffs.** If multiple interpretations exist, present them.
- **Simplicity first.** Write the minimum code that solves the problem. No speculative abstractions.
- **Surgical changes.** Touch only what you must. Match existing style.
- **Goal-driven execution.** Define success criteria before implementing.

---

## 🌿 Project Overview: VeganGlow

### Tech Stack
- **Web:** Next.js 16 (Storefront: App Router | Admin: Pages Router).
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, RLS, Storage).
- **Mobile:** Capacitor (iOS & Android).
- **Styling:** Vanilla CSS + CSS Modules. **Aesthetic:** Botanical, Glassmorphism, Premium.
- **Monorepo:** `apps/web`, `apps/mobile`, `apps/backend`, `packages/ui`, `packages/database`.

### ⚠️ IMPORTANT: Command Context
All commands **MUST** be executed from the **Root directory** (`VeganGlow`). Do not run commands directly inside workspace folders (e.g., `apps/web`) unless explicitly instructed.

### Core Commands (Run from Root)
- **Local Dev:** `npm run dev` (Starts the Next.js web application)
- **Mobile Dev:** `npm run dev:mobile` (Syncs mobile assets)
- **Rebuild Types:** `npm run db:types` (Syncs TypeScript types from Supabase)
- **Edge Functions:** `npm run functions:deploy` (Deploy to Supabase)
- **Database Management:** `npm run db:push`, `npm run db:reset`
- **Docker:** `npm run docker:dev` / `npm run docker:prod`
- **Verification:** `npm run lint`, `npm run type-check`, `npm run format`

---

## 🏗️ Architecture & Standards

### 1. Supabase & Security
- **Auth:** Use `@supabase/ssr`. Managed via cookies in middleware.
- **Security:** RLS (Row Level Security) is **MANDATORY** for all tables.
  - Public read: `is_active = true`.
  - Private data: Use `auth.uid()`.
- **Database:** Tables include `profiles`, `categories`, `products`, `orders`, `order_items`, `reviews`.

### 2. Coding Standards
- **TypeScript:** Strict mode strictly enforced. **NO `any` types.**
- **Components:** Server Components by default. Use `'use client'` only for interactivity.
- **CSS:** Every component must have a `.module.css`. Premium botanical theme with glassmorphism.
- **Localization:** All prices must be in **VND** (Vietnamese Dong).
- **File Naming:**
  - Components: PascalCase (`ProductCard.tsx`)
  - Hooks/Utils: camelCase (`useCart.ts`)
  - Shared Types: camelCase (`product.ts`)

### 3. Data Flow
- **Reading:** Server Components fetch directly from Supabase (server client).
- **Writing:** Client Components use browser client (RLS handles security).
- **Complex Logic:** Use **Supabase Edge Functions** (Deno) for checkout, inventory, and emails.

---

## 🚀 Workflow & Convention

### Commit Convention
Format: `<type>(<scope>): <description>`
Example: `feat(products): thêm bộ lọc giá sản phẩm`
- `feat`: New features
- `fix`: Bug fixes
- `style`: UI/UX improvements
- `refactor`: Code cleanup

### PR Checklist
- [ ] No `any` types.
- [ ] `npm run lint` and `npm run type-check` pass (run from Root).
- [ ] UI tested on **Mobile Viewport (375px)**.
- [ ] RLS policies verified if database schema changed.

---

**These guidelines ensure code quality and consistency for the VeganGlow monorepo.**
