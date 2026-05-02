import { describe, it, expect, beforeEach, vi } from 'vitest';
import { redis } from '@/lib/redis';
import { checkRateLimit } from './rateLimit';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkRateLimit', () => {
  it('returns tier 0 (no friction) on first attempt', async () => {
    (redis.incr as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);
    const r = await checkRateLimit('login:ip:1.2.3.4', { window: 900, captchaAt: 3, hardLimit: 30 });
    expect(r.tier).toBe(0);
    expect(r.allowed).toBe(true);
    expect(r.requiresCaptcha).toBe(false);
  });

  it('requires captcha at captchaAt threshold', async () => {
    (redis.incr as ReturnType<typeof vi.fn>).mockResolvedValueOnce(3);
    const r = await checkRateLimit('login:ip:1.2.3.4', { window: 900, captchaAt: 3, hardLimit: 30 });
    expect(r.tier).toBe(1);
    expect(r.requiresCaptcha).toBe(true);
    expect(r.allowed).toBe(true);
  });

  it('hard-blocks above hardLimit', async () => {
    (redis.incr as ReturnType<typeof vi.fn>).mockResolvedValueOnce(31);
    const r = await checkRateLimit('login:ip:1.2.3.4', { window: 900, captchaAt: 3, hardLimit: 30 });
    expect(r.tier).toBe(2);
    expect(r.allowed).toBe(false);
  });

  it('sets TTL on first hit (count=1)', async () => {
    (redis.incr as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);
    await checkRateLimit('login:ip:1.2.3.4', { window: 900, captchaAt: 3, hardLimit: 30 });
    expect(redis.expire).toHaveBeenCalledWith('login:ip:1.2.3.4', 900);
  });

  it('does NOT set TTL on subsequent hits', async () => {
    (redis.incr as ReturnType<typeof vi.fn>).mockResolvedValueOnce(2);
    await checkRateLimit('login:ip:1.2.3.4', { window: 900, captchaAt: 3, hardLimit: 30 });
    expect(redis.expire).not.toHaveBeenCalled();
  });
});
