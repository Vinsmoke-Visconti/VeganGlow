import { decodeJwt } from 'jose';

export type AccessTokenClaims = {
  sub: string;
  aal?: 'aal1' | 'aal2';
  app_metadata?: {
    staff_role?: string;
    is_super_admin?: boolean;
    role_weight?: number;
    permissions?: string[];
  };
} | null;

/**
 * Decode a Supabase access token's claims without verifying the signature.
 * Verification happens at Supabase Auth boundary; here we only read.
 */
export function decodeAccessToken(token: string | null | undefined): AccessTokenClaims {
  if (!token) return null;
  try {
    return decodeJwt(token) as AccessTokenClaims;
  } catch {
    return null;
  }
}

export function getStaffRole(claims: AccessTokenClaims): string {
  return claims?.app_metadata?.staff_role ?? 'customer';
}

export function isSuperAdmin(claims: AccessTokenClaims): boolean {
  const isSuper = claims?.app_metadata?.is_super_admin;
  return isSuper === true || String(isSuper) === 'true';
}

/** True iff user has any non-customer role. */
export function isStaff(claims: AccessTokenClaims): boolean {
  const role = getStaffRole(claims);
  return role !== 'customer' && role.length > 0;
}

export function getAal(claims: AccessTokenClaims): 'aal1' | 'aal2' {
  return claims?.aal ?? 'aal1';
}

export function getRoleWeight(claims: AccessTokenClaims): number {
  return claims?.app_metadata?.role_weight ?? 999;
}

export function hasPermission(claims: AccessTokenClaims, perm: string): boolean {
  return claims?.app_metadata?.permissions?.includes(perm) ?? false;
}

export function hasAnyPermission(claims: AccessTokenClaims, perms: string[]): boolean {
  const set = claims?.app_metadata?.permissions;
  if (!set) return false;
  return perms.some((p) => set.includes(p));
}
