'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { audit } from '@/lib/security/auditLog';
import { checkRecoverIpRate } from '@/lib/security/rateLimit';
import { constantDelay } from '@/lib/security/constantDelay';
import crypto from 'node:crypto';

type RecoverResult = { ok: boolean; error?: string; message?: string } | null;

type MinimalRpc = {
  rpc: (
    fn: string,
    args: { p_email: string; p_code: string }
  ) => Promise<{ data: { ok?: boolean } | null; error: { message: string } | null }>;
};

export async function recoverWithBackupCode(
  _prev: RecoverResult,
  formData: FormData
): Promise<RecoverResult> {
  const startedAt = Date.now();
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0] ?? null;
  const userAgent = h.get('user-agent');

  if (ip) {
    const r = await checkRecoverIpRate(ip);
    if (!r.allowed) {
      await constantDelay(startedAt, 500);
      return { ok: false, error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' };
    }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const code = String(formData.get('code') ?? '').trim();

  if (!email || !code) {
    await constantDelay(startedAt, 500);
    return { ok: false, error: 'Mã không hợp lệ' };
  }

  const supabase = await createClient();
  const rpcClient = supabase as unknown as MinimalRpc;
  const { data, error } = await rpcClient.rpc('verify_backup_code', {
    p_email: email,
    p_code: code,
  });

  if (error || !data?.ok) {
    await audit(
      { action: 'auth.login_fail', severity: 'warn', details: { reason: 'wrong_password' } },
      { ip, userAgent }
    );
    await constantDelay(startedAt, 500);
    return { ok: false, error: 'Mã không hợp lệ' };
  }

  // Pass — send magic link that lands user on /admin/setup-mfa to re-enroll
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/admin/setup-mfa?reenroll=true` },
  });

  const emailHash = crypto.createHash('sha256').update(email).digest('hex');
  await audit(
    { action: 'auth.magic_link_sent', severity: 'warn', details: { email_hash: emailHash } },
    { ip, userAgent }
  );

  await constantDelay(startedAt, 500);
  return {
    ok: true,
    message: 'Đã gửi link đăng nhập tới email của bạn. Vui lòng kiểm tra hộp thư.',
  };
}
