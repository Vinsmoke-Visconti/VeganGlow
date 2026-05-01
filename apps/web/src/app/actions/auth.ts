'use server';

import { sendPasswordOtpEmail } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'node:crypto';

import { audit } from '@/lib/security/auditLog';
import {
  checkLoginIpRate,
  checkLoginEmailRate,
  checkAdminLoginIpRate,
} from '@/lib/security/rateLimit';
import { constantDelay } from '@/lib/security/constantDelay';
import { verifyTurnstile } from '@/lib/security/turnstile';

export type AuthFormState = { error?: string; requiresCaptcha?: boolean } | null;

const GENERIC_LOGIN_ERROR = 'Email hoặc mật khẩu không đúng';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TARGET_LOGIN_DELAY_MS = 300;

function emailHash(email: string): string {
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');
}

function getClientIp(headersList: Awaited<ReturnType<typeof headers>>): string | null {
  return headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

type RpcUsernameToEmail = (
  fn: 'get_email_from_username',
  args: { p_username: string }
) => Promise<{ data: string | null; error: { message: string } | null }>;

type PasswordOtpPurpose = 'set_password' | 'change_password';

type CreateOtpVerificationRpc = (
  fn: 'create_otp_verification',
  args: { p_user_id: string; p_email: string; p_purpose: PasswordOtpPurpose }
) => Promise<{ data: string | null; error: { message: string } | null }>;

type VerifyOtpRpc = (
  fn: 'verify_otp',
  args: { p_user_id: string; p_purpose: PasswordOtpPurpose; p_code: string }
) => Promise<{ data: boolean | null; error: { message: string } | null }>;

function safeRedirectPath(value: FormDataEntryValue | string | null, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  try {
    const parsed = new URL(value, 'https://veganglow.local');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function getTrustedAppOrigin(originHeader: string | null) {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall back to the request origin below.
    }
  }

  if (originHeader) {
    try {
      const origin = new URL(originHeader);
      if (origin.protocol === 'https:' || origin.protocol === 'http:') {
        return origin.origin;
      }
    } catch {
      // Fall through to local development default.
    }
  }

  return 'http://localhost:3000';
}

export async function login(_prevState: AuthFormState, formData: FormData) {
  const startedAt = Date.now();
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const userAgent = headersList.get('user-agent');

  let identifier = formData.get('email') as string;
  const password = formData.get('password') as string;
  const captchaToken = String(formData.get('cf-turnstile-response') ?? '');
  const redirectTo = safeRedirectPath(formData.get('redirectTo'));

  // 1. IP rate limit (progressive: tier 1 captcha at 3 fails, hard 429 at 30)
  const ipRate = ip ? await checkLoginIpRate(ip) : null;
  if (ipRate?.allowed === false) {
    await audit(
      { action: 'auth.rate_limited', severity: 'warn', details: { tier: ipRate.tier, key: 'login:ip' } },
      { ip, userAgent }
    );
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: GENERIC_LOGIN_ERROR };
  }
  if (ipRate?.requiresCaptcha) {
    const valid = await verifyTurnstile(captchaToken, ip);
    if (!valid) {
      await audit(
        { action: 'auth.captcha_challenged', severity: 'info', details: { reason: 'tier1_ip' } },
        { ip, userAgent }
      );
      await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
      return { error: GENERIC_LOGIN_ERROR, requiresCaptcha: true };
    }
  }

  const supabase = await createClient();

  // Resolve username -> email if needed (preserve existing behavior)
  if (identifier && !identifier.includes('@')) {
    const getEmailFromUsername = supabase.rpc.bind(supabase) as unknown as RpcUsernameToEmail;
    const { data: resolvedEmail } = await getEmailFromUsername(
      'get_email_from_username',
      { p_username: identifier }
    );
    if (resolvedEmail) {
      identifier = resolvedEmail;
    }
  }

  // 2. Sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password,
  });

  if (error || !data.user) {
    // Increment per-email counter so progressive challenge applies even
    // across IP rotations targeting the same victim email.
    if (identifier && identifier.includes('@')) {
      await checkLoginEmailRate(emailHash(identifier));
    }
    await audit(
      { action: 'auth.login_fail', severity: 'warn', details: { reason: 'wrong_password' } },
      { ip, userAgent }
    );
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: GENERIC_LOGIN_ERROR };
  }

  // 3. Cross-realm block: staff (non-super_admin) cannot log in to storefront
  const role = data.user.app_metadata?.staff_role as string | undefined;
  const isSuper = data.user.app_metadata?.is_super_admin === true;
  if (role && role !== 'customer' && !isSuper) {
    await supabase.auth.signOut();
    await audit(
      { action: 'auth.cross_realm_blocked', severity: 'warn', details: { realm: 'storefront' } },
      { ip, userAgent }
    );
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: GENERIC_LOGIN_ERROR };
  }

  await audit(
    { action: 'auth.login_success', severity: 'info', details: { method: 'password' } },
    { ip, userAgent }
  );
  await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);

  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

export async function signup(_prevState: AuthFormState, formData: FormData) {
  const startedAt = Date.now();
  const headersList = await headers();
  const ip = getClientIp(headersList);

  const email = (formData.get('email') as string)?.trim() ?? '';
  const password = formData.get('password') as string;
  const fullName = (formData.get('fullName') as string)?.trim() ?? '';
  const captchaToken = String(formData.get('cf-turnstile-response') ?? '');

  const GENERIC_SIGNUP_ERROR = 'Không thể tạo tài khoản. Vui lòng thử lại.';

  // 1. Rate limit (same progressive tiers as login)
  const ipRate = ip ? await checkLoginIpRate(ip) : null;
  if (ipRate?.allowed === false) {
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: GENERIC_SIGNUP_ERROR };
  }
  if (ipRate?.requiresCaptcha) {
    const valid = await verifyTurnstile(captchaToken, ip);
    if (!valid) {
      await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
      return { error: GENERIC_SIGNUP_ERROR, requiresCaptcha: true };
    }
  }

  // 2. Input validation
  if (!EMAIL_REGEX.test(email) || email.length > 200) {
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: 'Email không hợp lệ.' };
  }
  if (!password || password.length < 8 || password.length > 128) {
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: 'Mật khẩu phải từ 8 đến 128 ký tự.' };
  }
  if (!fullName || fullName.length < 2 || fullName.length > 120) {
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: 'Họ tên phải từ 2 đến 120 ký tự.' };
  }

  // 3. Create account
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    // Never expose Supabase internals — log server-side only
    console.error('[signup] Supabase error:', error.message);
    
    // Provide a more helpful message for rate limits
    if (error.message.includes('rate limit')) {
      return { error: 'Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau một thời gian.' };
    }
    
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: GENERIC_SIGNUP_ERROR };
  }

  await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
  revalidatePath('/', 'layout');
  redirect('/login?message=Kiểm tra email của bạn để xác nhận tài khoản.');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function adminLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/admin', 'layout');
  redirect('/admin/login');
}

export async function adminGoogleLogin() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = getTrustedAppOrigin(headersList.get('origin'));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/admin&admin=true`,
    },
  });

  if (error || !data.url) {
    return redirect('/admin/login?error=oauth_failed');
  }

  redirect(data.url);
}

export async function adminLogin(_prevState: AuthFormState, formData: FormData) {
  const startedAt = Date.now();
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const userAgent = headersList.get('user-agent');

  let identifier = formData.get('email') as string;
  const password = formData.get('password') as string;
  const captchaToken = String(formData.get('cf-turnstile-response') ?? '');

  // 1. Stricter rate-limit for admin (captcha at fail #1, hard 429 at #15)
  const ipRate = ip ? await checkAdminLoginIpRate(ip) : null;
  if (ipRate?.allowed === false) {
    await audit(
      { action: 'auth.rate_limited', severity: 'warn', details: { tier: ipRate.tier, key: 'admin_login:ip' } },
      { ip, userAgent }
    );
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: GENERIC_LOGIN_ERROR };
  }
  if (ipRate?.requiresCaptcha) {
    const valid = await verifyTurnstile(captchaToken, ip);
    if (!valid) {
      await audit(
        { action: 'auth.captcha_challenged', severity: 'info', details: { reason: 'admin_login_tier1' } },
        { ip, userAgent }
      );
      await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
      return { error: GENERIC_LOGIN_ERROR, requiresCaptcha: true };
    }
  }

  const supabase = await createClient();

  if (identifier && !identifier.includes('@')) {
    const getEmailFromUsername = supabase.rpc.bind(supabase) as unknown as RpcUsernameToEmail;
    const { data: resolvedEmail } = await getEmailFromUsername(
      'get_email_from_username',
      { p_username: identifier }
    );
    if (resolvedEmail) {
      identifier = resolvedEmail;
    }
  }

  // 2. Sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password,
  });

  if (error || !data.user) {
    if (identifier && identifier.includes('@')) {
      await checkLoginEmailRate(emailHash(identifier));
    }
    await audit(
      { action: 'auth.login_fail', severity: 'warn', details: { reason: 'wrong_password' } },
      { ip, userAgent }
    );
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: GENERIC_LOGIN_ERROR };
  }

  // 3. Cross-realm block: customer cannot enter admin
  const role = data.user.app_metadata?.staff_role as string | undefined;
  if (!role || role === 'customer') {
    await supabase.auth.signOut();
    await audit(
      { action: 'auth.cross_realm_blocked', severity: 'warn', details: { realm: 'admin' } },
      { ip, userAgent }
    );
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: GENERIC_LOGIN_ERROR };
  }

  await audit(
    { action: 'auth.login_success', severity: 'info', details: { method: 'password' } },
    { ip, userAgent }
  );
  await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);

  // Middleware decides next step (setup-mfa / mfa-challenge / dashboard) based on AAL.
  revalidatePath('/admin', 'layout');
  redirect('/admin');
}

export async function signInWithGitHub() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = getTrustedAppOrigin(headersList.get('origin'));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/auth/callback?next=/admin&admin=true`,
    },
  });

  if (error || !data.url) {
    return redirect('/admin/login?error=oauth_failed');
  }

  redirect(data.url);
}

/**
 * Gửi mã OTP xác nhận
 */
export async function requestPasswordOtp(purpose: PasswordOtpPurpose) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: 'Bạn cần đăng nhập để thực hiện hành động này.' };
  }

  try {
    // Gọi RPC để tạo OTP (đã có logic Rate Limit 60s trong DB)
    const createOtpVerification = supabase.rpc.bind(supabase) as unknown as CreateOtpVerificationRpc;
    const { data: code, error: rpcError } = await createOtpVerification('create_otp_verification', {
      p_user_id: user.id,
      p_email: user.email,
      p_purpose: purpose
    });

    if (rpcError) {
      return { error: rpcError.message };
    }
    if (!code) {
      return { error: 'Không tạo được mã OTP.' };
    }

    // Gửi Email
    await sendPasswordOtpEmail(user.email, code, purpose);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : null;
    return { error: message || 'Lỗi hệ thống khi gửi OTP.' };
  }
}

/**
 * Xác thực và cập nhật mật khẩu
 */
export async function updatePasswordWithOtp(formData: FormData) {
  const purpose = formData.get('purpose') as PasswordOtpPurpose;
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const otpCode = formData.get('otpCode') as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Phiên đăng nhập hết hạn.' };

  // 1. Xác thực OTP qua RPC
  const verifyOtp = supabase.rpc.bind(supabase) as unknown as VerifyOtpRpc;
  const { data: isOtpValid, error: otpError } = await verifyOtp('verify_otp', {
    p_user_id: user.id,
    p_purpose: purpose,
    p_code: otpCode
  });

  if (otpError || !isOtpValid) {
    return { error: 'Mã OTP không chính xác hoặc đã hết hạn.' };
  }

  // 2. Nếu là đổi mật khẩu, cần xác thực mật khẩu cũ
  if (purpose === 'change_password') {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (loginError) {
      return { error: 'Mật khẩu hiện tại không chính xác.' };
    }
  }

  // 3. Cập nhật mật khẩu mới
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true };
}
