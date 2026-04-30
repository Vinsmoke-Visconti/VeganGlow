const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true if the token is valid, false otherwise.
 *
 * If FEATURE_TURNSTILE_ENABLED !== 'true', returns true (skip verification —
 * dev mode). If enabled but TURNSTILE_SECRET missing, fails closed (returns false).
 */
export async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  if (process.env.FEATURE_TURNSTILE_ENABLED !== 'true') {
    return true;
  }
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET missing — failing closed');
    return false;
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error('[turnstile] verification failed:', err);
    return false;
  }
}
