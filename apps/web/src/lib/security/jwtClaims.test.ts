import { describe, it, expect } from 'vitest';
import {
  decodeAccessToken,
  getStaffRole,
  isSuperAdmin,
  isStaff,
  getAal,
  getRoleWeight,
  hasPermission,
} from './jwtClaims';

/**
 * Build an unsigned JWT-shaped string. decodeJwt does not verify the signature,
 * so we can hand-craft one with base64url-encoded header + payload.
 */
function makeToken(payload: Record<string, unknown>): string {
  const b64u = (s: string) =>
    Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `${header}.${body}.signature`;
}

describe('jwt claim helpers', () => {
  it('decodes app_metadata fields', () => {
    const token = makeToken({
      sub: 'u1',
      aal: 'aal2',
      app_metadata: {
        staff_role: 'product_manager',
        is_super_admin: false,
        role_weight: 3,
        permissions: ['products:read', 'products:update'],
      },
    });
    const claims = decodeAccessToken(token);
    expect(getStaffRole(claims)).toBe('product_manager');
    expect(isStaff(claims)).toBe(true);
    expect(isSuperAdmin(claims)).toBe(false);
    expect(getAal(claims)).toBe('aal2');
    expect(getRoleWeight(claims)).toBe(3);
    expect(hasPermission(claims, 'products:read')).toBe(true);
    expect(hasPermission(claims, 'products:delete')).toBe(false);
  });

  it('returns null for malformed token', () => {
    expect(decodeAccessToken('not.a.token')).toBeNull();
    expect(decodeAccessToken(null)).toBeNull();
    expect(decodeAccessToken(undefined)).toBeNull();
  });

  it('treats missing staff_role as customer (non-staff)', () => {
    const token = makeToken({ sub: 'u1', aal: 'aal1' });
    const claims = decodeAccessToken(token);
    expect(getStaffRole(claims)).toBe('customer');
    expect(isStaff(claims)).toBe(false);
    expect(isSuperAdmin(claims)).toBe(false);
  });

  it('detects super_admin', () => {
    const token = makeToken({
      sub: 'u1',
      aal: 'aal2',
      app_metadata: { staff_role: 'super_admin', is_super_admin: true, role_weight: 1 },
    });
    const claims = decodeAccessToken(token);
    expect(isSuperAdmin(claims)).toBe(true);
    expect(isStaff(claims)).toBe(true);
  });
});
