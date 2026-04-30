import crypto from 'node:crypto';

/**
 * HMAC-SHA256 hash of an IP address using a server-side pepper.
 * Used in audit_logs.ip_hash for PII-safe correlation.
 * Returns null for empty/missing IP.
 */
export function hashIp(ip: string | null | undefined, pepper: string): string | null {
  if (!ip || typeof ip !== 'string') return null;
  return crypto.createHmac('sha256', pepper).update(ip).digest('hex');
}

export function getServerIpPepper(): string {
  const p = process.env.AUDIT_IP_PEPPER;
  if (!p || p.length < 32) {
    throw new Error('AUDIT_IP_PEPPER must be set to a 32+ char random string');
  }
  return p;
}

/**
 * Safe variant that returns null instead of throwing if pepper is missing.
 * Use in audit() helper so audit failure doesn't break business logic.
 */
export function tryHashIp(ip: string | null | undefined): string | null {
  try {
    if (!ip) return null;
    return hashIp(ip, getServerIpPepper());
  } catch {
    return null;
  }
}
