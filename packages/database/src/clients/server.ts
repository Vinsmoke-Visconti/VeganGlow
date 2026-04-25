// ============================================
// @veganglow/database — Supabase Server Client
// Dùng trong Server Components, API Routes, Server Actions
// ============================================
import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../database';

export async function createServerClient() {
  const cookieStore = await cookies();
  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Bỏ qua nếu gọi từ Server Component — middleware sẽ refresh session.
          }
        },
      },
    }
  );
}
