<!-- BEGIN:nextjs-agent-rules -->
# VeganGlow Agent Rules

## Project Structure
- Monorepo: `frontend/` (Next.js 16), `backend/` (Supabase), `mobile/` (Capacitor)
- Frontend uses App Router (NOT Pages Router)
- TypeScript strict mode — NO `any` types

## Supabase
- Always use `@supabase/ssr` for auth (NOT `@supabase/auth-helpers`)
- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts`
- Types: `src/types/database.ts`

## Coding Standards
- Server Components by default, `'use client'` only when needed
- CSS Modules for component styles
- Zustand for client-side state (cart)
- All prices in VND (Vietnamese Dong)

## Security
- NEVER expose `SUPABASE_SERVICE_ROLE_KEY` in frontend
- RLS enabled on ALL tables
- Use `auth.uid()` in policies, never `user_metadata`

## File Naming
- Components: PascalCase (`ProductCard.tsx`)
- Hooks: camelCase with `use` prefix (`useAuth.ts`)
- Utils: camelCase (`utils.ts`)
- Types: camelCase (`product.ts`)
<!-- END:nextjs-agent-rules -->
