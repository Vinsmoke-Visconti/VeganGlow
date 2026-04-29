import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';

/**
 * Next.js 16/Turbopack Proxy Function
 * This replaces the traditional middleware.ts for better performance and Turbopack compatibility.
 * It must export a function named 'proxy' or a default export.
 */
export default async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error('Proxy session update failed:', error);
    // Return the request as is to prevent complete site failure on session error
    return;
  }
}

// Ensure the proxy runs on all relevant routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
