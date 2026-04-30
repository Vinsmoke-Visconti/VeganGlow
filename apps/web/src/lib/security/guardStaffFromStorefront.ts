import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { decodeAccessToken, isStaff, isSuperAdmin } from './jwtClaims';

/**
 * Defense-in-depth Layer 2 (Server Component).
 *
 * Calls notFound() if the current user is staff (non-super_admin) — these
 * users must not see purchase-flow pages (cart, checkout, orders, profile,
 * wishlist, vouchers). Middleware already redirects them to /admin; this
 * is the fallback if middleware is bypassed.
 *
 * notFound() is preferred over redirect() because it doesn't leak that the
 * route exists for someone — the page returns 404 to the violator.
 */
export async function guardStaffFromStorefront(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // unauthenticated users hit their own redirect at higher layers

  const { data: { session } } = await supabase.auth.getSession();
  const claims = decodeAccessToken(session?.access_token ?? null);
  if (isStaff(claims) && !isSuperAdmin(claims)) {
    notFound();
  }
}
