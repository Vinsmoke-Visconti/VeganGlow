import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import {
  decodeAccessToken,
  getStaffRole,
  isSuperAdmin,
  isStaff,
  getAal,
} from '@/lib/security/jwtClaims';

/** Storefront paths that require auth. */
const STOREFRONT_PROTECTED_ROUTES = [
  '/cart',
  '/checkout',
  '/profile',
  '/orders',
  '/wishlist',
  '/vouchers',
];

/** Admin paths exempt from MFA/AAL enforcement (the gates themselves). */
const ADMIN_EXEMPT_PATHS = new Set([
  '/admin/login',
  '/admin/setup-mfa',
  '/admin/mfa-challenge',
  '/admin/recover',
]);

const IDLE_TIMEOUT_SECS = 30 * 60;

const isProd = process.env.NODE_ENV === 'production';

function buildAdminCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('ERROR: Missing Supabase environment variables in Middleware.');
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();

  // Decode JWT app_metadata locally — zero DB roundtrip for role checks.
  const claims = decodeAccessToken(session?.access_token ?? null);
  const role = getStaffRole(claims);
  const superAdmin = isSuperAdmin(claims);
  const staff = isStaff(claims);
  const aal = getAal(claims);

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Helper to ensure cookies (like signOut) are preserved on redirect
  const redirectWithCookies = (targetUrl: URL) => {
    const redirectRes = NextResponse.redirect(targetUrl);
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectRes.cookies.set(cookie.name, cookie.value);
    });
    return redirectRes;
  };

  // ============================ ADMIN AREA ============================
  if (pathname.startsWith('/admin')) {
    // Not logged in → /admin/login
    if (!user) {
      if (pathname !== '/admin/login') {
        url.pathname = '/admin/login';
        return redirectWithCookies(url);
      }
      return supabaseResponse;
    }

    // Already logged in but on /admin/login → bounce to /admin
    if (pathname === '/admin/login') {
      url.pathname = '/admin';
      return redirectWithCookies(url);
    }

    // Customer trying to enter admin → STRICT ISOLATION: sign out and force login
    if (!staff && !superAdmin) {
      await supabase.auth.signOut();
      url.pathname = '/admin/login';
      return redirectWithCookies(url);
    }

    // Idle timeout (feature-flagged)
    if (process.env.FEATURE_IDLE_TIMEOUT_ENABLED === 'true') {
      const lastActivityCookie = request.cookies.get('admin_last_activity')?.value;
      if (lastActivityCookie) {
        const last = Number(lastActivityCookie);
        if (!Number.isNaN(last) && (Date.now() - last) / 1000 > IDLE_TIMEOUT_SECS) {
          await supabase.auth.signOut();
          url.pathname = '/admin/login';
          url.searchParams.set('reason', 'idle');
          return redirectWithCookies(url);
        }
      }
    }

    // AAL enforcement for super_admin (forces TOTP setup + challenge)
    if (
      process.env.FEATURE_MFA_ENFORCED === 'true' &&
      superAdmin &&
      !ADMIN_EXEMPT_PATHS.has(pathname)
    ) {
      const factorStatus = request.cookies.get('mfa_factor_status')?.value;
      let hasVerifiedTotp = factorStatus === 'verified';

      if (factorStatus === undefined) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        hasVerifiedTotp = factors?.totp?.some((f) => f.status === 'verified') ?? false;
        supabaseResponse.cookies.set(
          'mfa_factor_status',
          hasVerifiedTotp ? 'verified' : 'none',
          {
            httpOnly: true,
            secure: isProd,
            sameSite: 'strict',
            path: '/admin',
            maxAge: 300,
          }
        );
      }

      if (!hasVerifiedTotp) {
        url.pathname = '/admin/setup-mfa';
        return redirectWithCookies(url);
      }
      if (aal === 'aal1') {
        url.pathname = '/admin/mfa-challenge';
        return redirectWithCookies(url);
      }
    }

    // /admin/system/* requires super_admin
    if (pathname.startsWith('/admin/system') && !superAdmin) {
      url.pathname = '/admin';
      return redirectWithCookies(url);
    }

    // Inject CSP nonce header for admin pages (admin layout already force-dynamic)
    const nonceBuffer = new Uint8Array(16);
    crypto.getRandomValues(nonceBuffer);
    const nonce = btoa(String.fromCharCode(...nonceBuffer));
    supabaseResponse.headers.set('Content-Security-Policy', buildAdminCsp(nonce));
    supabaseResponse.headers.set('x-nonce', nonce);

    // Suppress unused-var warning for `role` — kept for future RBAC checks
    void role;

    return supabaseResponse;
  }

  // ============================ STOREFRONT AREA ============================
  
  // Staff trying to enter storefront → STRICT ISOLATION: sign out and force login
  if (user && staff) {
    await supabase.auth.signOut();
    url.pathname = '/login';
    return redirectWithCookies(url);
  }

  // Auth Pages (Login / Register)
  if (pathname === '/login' || pathname === '/register') {
    if (user) {
      url.pathname = '/';
      return redirectWithCookies(url);
    }
    return supabaseResponse;
  }

  // Storefront Protected Routes
  const isProtected = STOREFRONT_PROTECTED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  if (isProtected) {
    if (!user) {
      url.pathname = '/login';
      url.searchParams.set('redirectTo', `${pathname}${request.nextUrl.search}`);
      return redirectWithCookies(url);
    }
  }

  return supabaseResponse;
}
