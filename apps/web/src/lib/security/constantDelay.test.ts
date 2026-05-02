import { describe, it, expect } from 'vitest';
import { constantDelay } from './constantDelay';

describe('constantDelay', () => {
  it('ensures total elapsed >= target', async () => {
    const start = Date.now();
    await constantDelay(start, 200);
    expect(Date.now() - start).toBeGreaterThanOrEqual(195);
  });

  it('returns immediately if elapsed >= target', async () => {
    const past = Date.now() - 1000;
    const t0 = Date.now();
    await constantDelay(past, 200);
    expect(Date.now() - t0).toBeLessThan(50);
  });

  it('handles zero target (no-op)', async () => {
    const start = Date.now();
    await constantDelay(start, 0);
    expect(Date.now() - start).toBeLessThan(50);
  });
});
