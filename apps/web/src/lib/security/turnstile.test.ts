import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstile } from './turnstile';

const fetchMock = vi.fn();
const originalFetch = globalThis.fetch;
const originalEnabled = process.env.FEATURE_TURNSTILE_ENABLED;
const originalSecret = process.env.TURNSTILE_SECRET;

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalEnabled === undefined) delete process.env.FEATURE_TURNSTILE_ENABLED;
  else process.env.FEATURE_TURNSTILE_ENABLED = originalEnabled;
  if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET;
  else process.env.TURNSTILE_SECRET = originalSecret;
});

describe('verifyTurnstile', () => {
  it('returns true on success', async () => {
    process.env.FEATURE_TURNSTILE_ENABLED = 'true';
    process.env.TURNSTILE_SECRET = 'secret';
    fetchMock.mockResolvedValueOnce({ json: async () => ({ success: true }) });
    expect(await verifyTurnstile('valid-token', '1.2.3.4')).toBe(true);
  });

  it('returns false on Cloudflare failure', async () => {
    process.env.FEATURE_TURNSTILE_ENABLED = 'true';
    process.env.TURNSTILE_SECRET = 'secret';
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: false, 'error-codes': ['invalid'] }),
    });
    expect(await verifyTurnstile('bad-token', '1.2.3.4')).toBe(false);
  });

  it('returns false on network error', async () => {
    process.env.FEATURE_TURNSTILE_ENABLED = 'true';
    process.env.TURNSTILE_SECRET = 'secret';
    fetchMock.mockRejectedValueOnce(new Error('network'));
    expect(await verifyTurnstile('token', '1.2.3.4')).toBe(false);
  });

  it('returns true if FEATURE_TURNSTILE_ENABLED is not "true" (skip in dev)', async () => {
    process.env.FEATURE_TURNSTILE_ENABLED = 'false';
    delete process.env.TURNSTILE_SECRET;
    expect(await verifyTurnstile('whatever', '1.2.3.4')).toBe(true);
  });

  it('fails closed if enabled but secret missing', async () => {
    process.env.FEATURE_TURNSTILE_ENABLED = 'true';
    delete process.env.TURNSTILE_SECRET;
    expect(await verifyTurnstile('token', '1.2.3.4')).toBe(false);
  });
});
