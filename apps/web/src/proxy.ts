import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16/Turbopack Proxy Function
 * Using a named export 'proxy' as preferred by some Turbopack versions.
 */
export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (err) {
    console.error('Proxy/Middleware crash:', err);
    return NextResponse.next({ request });
  }
}

// Default export as fallback
export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
