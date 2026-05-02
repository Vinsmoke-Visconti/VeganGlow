'use server';

import { createClient } from '@/lib/supabase/server';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { audit } from '@/lib/security/auditLog';
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';

type EnrollResult = { factorId: string; qrSvg: string; secret: string; uri: string };
type VerifyResult = { ok: boolean; error?: string; backupCodes?: string[] };
type ChallengeResult = { ok: boolean; error?: string };

// Database types stale until `npm run db:types` runs after migration push.
// Cast through minimal shape for the new RPCs.
type MinimalSupabaseRpc = {
  rpc: (fn: string, args: { p_codes: string[] }) => Promise<{ error: { message: string } | null }>;
};

function generateBackupCode(): string {
  // 8-char hex split into ABCD-EFGH
  const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
  return raw.slice(0, 4) + '-' + raw.slice(4, 8);
}

export async function startMfaEnrollment(): Promise<EnrollResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error || !data) {
    throw error ?? new Error('MFA enrollment failed');
  }
  const svg = await QRCode.toString(data.totp.uri, { type: 'svg', width: 220, margin: 1 });
  return { factorId: data.id, qrSvg: svg, secret: data.totp.secret, uri: data.totp.uri };
}

export async function verifyMfaEnrollment(
  _prev: VerifyResult | null,
  formData: FormData
): Promise<VerifyResult> {
  const factorId = String(formData.get('factorId') ?? '');
  const code = String(formData.get('code') ?? '');
  if (!factorId || !code) return { ok: false, error: 'Thiếu thông tin' };

  const supabase = await createClient();

  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    return { ok: false, error: 'Mã không hợp lệ' };
  }

  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (verify.error) {
    return { ok: false, error: 'Mã không hợp lệ' };
  }

  // Generate 8 backup codes; store bcrypt hashes via SECURITY DEFINER RPC
  const codes = Array.from({ length: 8 }, generateBackupCode);
  const rpcClient = supabase as unknown as MinimalSupabaseRpc;
  const { error: rpcErr } = await rpcClient.rpc('create_backup_codes', { p_codes: codes });
  if (rpcErr) {
    return { ok: false, error: 'Không thể tạo backup codes: ' + rpcErr.message };
  }

  const h = await headers();
  await audit(
    { action: 'auth.mfa_enrolled', severity: 'info' },
    {
      ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
      userAgent: h.get('user-agent'),
    }
  );

  // Invalidate cached factor cookie so middleware re-checks on next request
  const c = await cookies();
  c.delete('mfa_factor_status');

  return { ok: true, backupCodes: codes };
}

export async function challengeMfa(
  _prev: ChallengeResult | null,
  formData: FormData
): Promise<ChallengeResult> {
  const code = String(formData.get('code') ?? '');
  if (!code) return { ok: false, error: 'Vui lòng nhập mã' };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.find((f) => f.status === 'verified');
  if (!factor) return { ok: false, error: 'Chưa có TOTP factor' };

  const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challenge.error || !challenge.data) {
    return { ok: false, error: 'Lỗi hệ thống, thử lại' };
  }

  const verify = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.data.id,
    code,
  });

  const h = await headers();
  const ctx = {
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
    userAgent: h.get('user-agent'),
  };

  if (verify.error) {
    await audit({ action: 'auth.mfa_failed', severity: 'warn' }, ctx);
    return { ok: false, error: 'Mã không hợp lệ' };
  }

  await audit({ action: 'auth.mfa_success', severity: 'info' }, ctx);
  redirect('/admin');
}
