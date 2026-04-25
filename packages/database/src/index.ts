// ============================================
// @veganglow/database — Public Entry Point
// Import từ đây để dùng trong apps/web và apps/mobile
// ============================================

// --- Database Types (Auto-generated từ Supabase) ---
export type { Database, Json } from './database';
export type { Tables, TablesInsert, TablesUpdate } from './helpers';

// --- Shared Domain Types ---
export type { Product, Category, ProductWithCategory } from './product';
export type { Order, OrderItem, OrderWithItems } from './order';
export type { Profile, UserWithProfile, Address } from './user';

// --- Supabase Clients (dùng đúng client cho từng môi trường) ---
// Web - Browser (Client Component)
export { createBrowserClient } from './clients/client';
// Web - Server (Server Component / API Route)
export { createServerClient } from './clients/server';
// Web - Middleware (Next.js middleware)
export { createMiddlewareClient } from './clients/middleware';
