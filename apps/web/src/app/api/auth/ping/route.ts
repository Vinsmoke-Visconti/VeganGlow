import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Lightweight ping endpoint that records the latest admin activity timestamp
 * in an HttpOnly cookie. Read by middleware to enforce 30-min idle timeout.
 *
 * No body, no auth lookup — just sets the cookie and returns 204.
 */
export async function POST() {
  const c = await cookies();
  c.set('admin_last_activity', Date.now().toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60,
  });
  return new NextResponse(null, { status: 204 });
}
