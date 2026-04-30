import { redis } from '@/lib/redis';

export type RateLimitOptions = {
  /** Window length in seconds */
  window: number;
  /** Count threshold at which captcha is required (>= this returns requiresCaptcha=true) */
  captchaAt: number;
  /** Count above which requests are denied (returns allowed=false) */
  hardLimit: number;
};

export type RateLimitResult = {
  count: number;
  /** 0 = no friction, 1 = captcha required, 2 = hard blocked */
  tier: 0 | 1 | 2;
  allowed: boolean;
  requiresCaptcha: boolean;
};

/**
 * Atomic increment with TTL. Returns tier classification.
 * NOTE: This always increments — do not call to "check" without intent to record.
 * For check-only without increment, use peekRateLimit().
 */
export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, opts.window);
  }

  if (count > opts.hardLimit) {
    return { count, tier: 2, allowed: false, requiresCaptcha: true };
  }
  if (count >= opts.captchaAt) {
    return { count, tier: 1, allowed: true, requiresCaptcha: true };
  }
  return { count, tier: 0, allowed: true, requiresCaptcha: false };
}

/** Read current count without incrementing. */
export async function peekRateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const raw = await redis.get<number | string>(key);
  const count = Number(raw ?? 0);
  if (count > opts.hardLimit) {
    return { count, tier: 2, allowed: false, requiresCaptcha: true };
  }
  if (count >= opts.captchaAt) {
    return { count, tier: 1, allowed: true, requiresCaptcha: true };
  }
  return { count, tier: 0, allowed: true, requiresCaptcha: false };
}

export async function resetRateLimit(key: string): Promise<void> {
  await redis.del(key);
}

// === Convenience wrappers per-endpoint ===

export async function checkLoginIpRate(ip: string) {
  return checkRateLimit(`login:ip:${ip}`, { window: 900, captchaAt: 3, hardLimit: 30 });
}

export async function checkLoginEmailRate(emailHash: string) {
  // Tier 1 at 5; never hard-blocks (hardLimit very high) — use magic-link path instead.
  return checkRateLimit(`login:email:${emailHash}`, { window: 900, captchaAt: 5, hardLimit: 100 });
}

export async function checkAdminLoginIpRate(ip: string) {
  return checkRateLimit(`admin_login:ip:${ip}`, { window: 900, captchaAt: 1, hardLimit: 15 });
}

export async function checkRecoverIpRate(ip: string) {
  return checkRateLimit(`recover_backup:ip:${ip}`, { window: 900, captchaAt: 0, hardLimit: 3 });
}
