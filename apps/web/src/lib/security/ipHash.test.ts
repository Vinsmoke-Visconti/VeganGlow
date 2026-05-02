import { describe, it, expect } from 'vitest';
import { hashIp, tryHashIp } from './ipHash';

describe('hashIp', () => {
  it('returns deterministic hash for same input', () => {
    const a = hashIp('1.2.3.4', 'pepper');
    const b = hashIp('1.2.3.4', 'pepper');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns different hash for different IPs', () => {
    expect(hashIp('1.2.3.4', 'pepper')).not.toBe(hashIp('5.6.7.8', 'pepper'));
  });

  it('returns different hash for different peppers', () => {
    expect(hashIp('1.2.3.4', 'pepperA')).not.toBe(hashIp('1.2.3.4', 'pepperB'));
  });

  it('returns null for empty IP', () => {
    expect(hashIp('', 'pepper')).toBeNull();
    expect(hashIp(null, 'pepper')).toBeNull();
    expect(hashIp(undefined, 'pepper')).toBeNull();
  });
});

describe('tryHashIp', () => {
  it('returns null when pepper missing instead of throwing', () => {
    delete process.env.AUDIT_IP_PEPPER;
    expect(tryHashIp('1.2.3.4')).toBeNull();
  });

  it('returns hash when pepper present', () => {
    process.env.AUDIT_IP_PEPPER = 'a'.repeat(32);
    expect(tryHashIp('1.2.3.4')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns null for falsy input even with pepper', () => {
    process.env.AUDIT_IP_PEPPER = 'a'.repeat(32);
    expect(tryHashIp(null)).toBeNull();
  });
});
