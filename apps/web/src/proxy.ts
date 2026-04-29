import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16/Turbopack Proxy Function
 * Using a named export 'proxy' as preferred by some Turbopack versions.
 */
export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error('Proxy session update failed:', error);
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
