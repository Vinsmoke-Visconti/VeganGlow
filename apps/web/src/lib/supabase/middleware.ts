import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // 1. BACK-OFFICE ROUTES (/admin/*)
  if (pathname.startsWith('/admin')) {
    // 1a. Not logged in -> Redirect to login
    if (!user) {
      if (pathname !== '/admin/login') {
        url.pathname = '/admin/login';
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // If logged in but on login page, redirect to dashboard
    if (pathname === '/admin/login') {
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url);
    }

    // 1b. Check if user is staff
    const { data: isStaff } = await supabase.rpc('is_staff');
    if (!isStaff) {
      // Customer trying to access admin -> Redirect to storefront
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // 1c. Super Admin routes (/admin/system/*)
    if (pathname.startsWith('/admin/system')) {
      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
      if (!isSuperAdmin) {
        url.pathname = '/admin/dashboard';
        return NextResponse.redirect(url);
      }
    }
  } 
  
  // 2. AUTH ROUTES FOR CUSTOMER (/login, /register)
  else if (pathname === '/login' || pathname === '/register') {
    if (user) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // 3. PROTECTED STOREFRONT ROUTES (/profile, /orders)
  else if (pathname.startsWith('/profile') || pathname === '/orders') {
    if (!user) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
