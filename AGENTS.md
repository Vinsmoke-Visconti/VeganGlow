<!-- BEGIN:nextjs-agent-rules -->
# VeganGlow Agent Rules

## Project Structure
- **Root Directory:** `VeganGlow/` (All commands MUST be run here)
- **Monorepo Workspaces:**
  - `apps/web`: Next.js 16 Web App (Storefront + Admin)
  - `apps/mobile`: Capacitor Mobile App
  - `apps/backend`: Supabase Backend (Migrations, Edge Functions)
  - `packages/ui`: Shared UI Components
  - `packages/database`: Shared Supabase Clients & Types

## Core Commands (Run from Root)
- Local Dev: `npm run dev`
- Build Types: `npm run db:types`
- Deploy Functions: `npm run functions:deploy`
- Lint: `npm run lint`

## Coding Standards
- **TypeScript:** Strict mode strictly enforced. NO `any` types.
- **Components:** Server Components by default. Use `'use client'` only when needed.
- **CSS:** CSS Modules for component styles.
- **State:** Zustand for client-side state (cart).
- **Currency:** All prices in VND (Vietnamese Dong).

## Security
- NEVER expose `SUPABASE_SERVICE_ROLE_KEY` in frontend.
- RLS enabled on ALL tables.
- Use `auth.uid()` in policies, never `user_metadata`.

## File Naming
- Components: PascalCase (`ProductCard.tsx`)
- Hooks/Utils: camelCase (`useAuth.ts`, `formatPrice.ts`)
- Types: camelCase (`product.ts`)
<!-- END:nextjs-agent-rules -->
