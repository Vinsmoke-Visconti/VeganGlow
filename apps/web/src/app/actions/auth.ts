'use server';

import { sendPasswordOtpEmail, sendAdminLoginAlert, sendRegistrationOtpEmail } from '@/lib/email';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'node:crypto';

import { audit } from '@/lib/security/auditLog';
import { constantDelay } from '@/lib/security/constantDelay';
import {
  checkAdminLoginIpRate,
  checkLoginEmailRate,
  checkLoginIpRate,
} from '@/lib/security/rateLimit';
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

async function getTrustedAppOrigin() {
  try {
    const { headers: getHeaders } = require('next/headers');
    const h = await getHeaders();
    
    // Vercel and most proxies provide x-forwarded-host
    const forwardedHost = h.get('x-forwarded-host');
    const host = forwardedHost || h.get('host') || '';
    
    if (host) {
      // For local development on localhost/127.0.0.1, always use http
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return `http://${host}`;
      }
      
      // For local network IPs (e.g. 192.168.x.x), default to http unless specified
      const isLocalIp = /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
      const protocol = h.get('x-forwarded-proto') || (isLocalIp ? 'http' : 'https');
      return `${protocol}://${host}`;
    }
  } catch (err) {
    // Fallback to defaults
  }

  // Final fallback based on environment
  return process.env.NODE_ENV === 'production' 
    ? (process.env.NEXT_PUBLIC_SITE_URL || 'https://veganglow.vercel.app')
    : 'http://localhost:3000';
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

  // 3. Cross-realm block: staff cannot log in to storefront
  const role = data.user.app_metadata?.staff_role as string | undefined;
  if (role && role !== 'customer') {
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

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;

/**
 * Step 1: Gửi mã OTP xác nhận email khi đăng ký
 * Lưu OTP vào Redis với TTL 10 phút
 */
export async function sendRegisterOtp(_prevState: AuthFormState, formData: FormData) {
  const startedAt = Date.now();
  const headersList = await headers();
  const ip = getClientIp(headersList);

  const email = (formData.get('email') as string)?.trim() ?? '';

  if (!email || !EMAIL_REGEX.test(email) || email.length > 200) {
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: 'Email không hợp lệ.' };
  }

  // Rate limit
  const ipRate = ip ? await checkLoginIpRate(ip) : null;
  if (ipRate?.allowed === false) {
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' };
  }

  // Generate 6-digit OTP
  const code = crypto.randomInt(100000, 999999).toString();
  const redisKey = `reg_otp:${email.toLowerCase()}`;

  try {
    const { cacheSet } = await import('@/lib/redis');
    // Store OTP in Redis for 10 minutes
    await cacheSet(redisKey, { code, email: email.toLowerCase(), createdAt: Date.now() }, 600);
  } catch (err) {
    console.error('[sendRegisterOtp] Redis error:', err);
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: 'Lỗi hệ thống. Vui lòng thử lại.' };
  }

  // Send OTP email
  try {
    await sendRegistrationOtpEmail(email, code);
  } catch (err) {
    console.error('[sendRegisterOtp] Email error:', err);
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: 'Không thể gửi email. Vui lòng kiểm tra lại địa chỉ email.' };
  }

  await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
  return { success: true, message: 'Mã xác nhận đã được gửi đến email của bạn.' };
}

/**
 * Step 2: Xác nhận mã OTP đăng ký
 * Trả về token xác nhận nếu OTP đúng
 */
export async function verifyRegisterOtp(email: string, code: string): Promise<{ success?: boolean; token?: string; error?: string }> {
  const redisKey = `reg_otp:${email.toLowerCase()}`;

  try {
    const { cacheGet, cacheDelete } = await import('@/lib/redis');
    const stored = await cacheGet<{ code: string; email: string; createdAt: number }>(redisKey);

    if (!stored) {
      return { error: 'Mã xác nhận đã hết hạn. Vui lòng gửi lại mã mới.' };
    }

    if (stored.code !== code.trim()) {
      return { error: 'Mã xác nhận không đúng.' };
    }

    // OTP is correct - create a verification token and store it
    const token = crypto.randomBytes(32).toString('hex');
    const tokenKey = `reg_verified:${email.toLowerCase()}`;
    const { cacheSet } = await import('@/lib/redis');
    await cacheSet(tokenKey, { email: email.toLowerCase(), token, verifiedAt: Date.now() }, 1800); // 30 min

    // Delete the OTP
    await cacheDelete(redisKey);

    return { success: true, token };
  } catch (err) {
    console.error('[verifyRegisterOtp] error:', err);
    return { error: 'Lỗi hệ thống. Vui lòng thử lại.' };
  }
}

/**
 * Step 3: Tạo tài khoản (email đã được xác nhận qua OTP)
 */
export async function signup(_prevState: AuthFormState, formData: FormData) {
  const startedAt = Date.now();
  const headersList = await headers();
  const ip = getClientIp(headersList);

  const email = (formData.get('email') as string)?.trim() ?? '';
  const username = (formData.get('username') as string)?.trim() ?? '';
  const password = formData.get('password') as string;
  const verifyToken = (formData.get('verifyToken') as string)?.trim() ?? '';

  const GENERIC_SIGNUP_ERROR = 'Không thể tạo tài khoản. Vui lòng thử lại.';

  // Validate inputs
  if (!email || !EMAIL_REGEX.test(email)) {
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: 'Email không hợp lệ.' };
  }
  if (!username || !USERNAME_REGEX.test(username)) {
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: 'Tên đăng nhập phải từ 3-30 ký tự, không dấu cách.' };
  }
  if (!password || password.length < 6 || password.length > 128) {
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: 'Mật khẩu phải từ 6 đến 128 ký tự.' };
  }

  // Verify the email was confirmed via OTP
  try {
    const { cacheGet, cacheDelete } = await import('@/lib/redis');
    const tokenKey = `reg_verified:${email.toLowerCase()}`;
    const stored = await cacheGet<{ email: string; token: string; verifiedAt: number }>(tokenKey);

    if (!stored || stored.token !== verifyToken) {
      await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
      return { error: 'Email chưa được xác nhận hoặc phiên đã hết hạn. Vui lòng thử lại.' };
    }

    // Create user with service role (auto-confirmed since OTP verified)
    const adminClient = createServiceClient();
    const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: username,
        user_name: username.toLowerCase(),
      },
    });

    if (adminError) {
      console.error('[signup] Admin createUser error:', adminError.message);
      if (adminError.message.includes('already') || adminError.message.includes('duplicate') || adminError.message.includes('exists')) {
        await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
        return { error: 'Email hoặc tên đăng nhập đã được sử dụng.' };
      }
      await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
      return { error: GENERIC_SIGNUP_ERROR };
    }

    // Gửi email chào mừng ngay sau khi tạo tài khoản thành công
    try {
      // Import dynamic để tránh vòng lặp hoặc lỗi nếu chưa import ở trên
      const { sendWelcomeEmail } = await import('@/lib/email');
      await sendWelcomeEmail(email, username);
    } catch (emailErr) {
      console.error('[signup] Failed to send welcome email:', emailErr);
    }

    // Clean up the verification token
    await cacheDelete(tokenKey);

    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    revalidatePath('/', 'layout');
    redirect('/login?message=Tạo tài khoản thành công! Hãy đăng nhập.');
  } catch (err: unknown) {
    // redirect() throws a special error - rethrow it
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    console.error('[signup] Unexpected error:', err);
    await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);
    return { error: GENERIC_SIGNUP_ERROR };
  }
}

export async function logout() {
  const supabase = await createClient();
  
  // Log before signing out to capture actor info
  await audit({ action: 'auth.logout', severity: 'info' });
  
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function adminLogout() {
  const supabase = await createClient();
  
  // Log before signing out to capture actor info
  await audit({ action: 'auth.logout', severity: 'info' });

  await supabase.auth.signOut();

  revalidatePath('/admin', 'layout');
  redirect('/admin/login');
}

export async function adminGoogleLogin() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = await getTrustedAppOrigin();

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
  const isSuper = data.user.app_metadata?.is_super_admin === true || String(data.user.app_metadata?.is_super_admin) === 'true';
  if ((!role || role === 'customer') && !isSuper) {
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
  
  // Send email alert for admin login
  const adminName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'Admin';
  sendAdminLoginAlert(identifier, adminName, { ip: ip ?? undefined, userAgent: userAgent ?? undefined }).catch(err => {
    console.error('Failed to send admin login alert:', err);
  });

  await constantDelay(startedAt, TARGET_LOGIN_DELAY_MS);

  // Reset idle timeout cookie on fresh login
  const c = await import('next/headers').then(m => m.cookies());
  c.set('admin_last_activity', Date.now().toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60,
  });

  // Middleware decides next step (setup-mfa / mfa-challenge / dashboard) based on AAL.
  revalidatePath('/admin', 'layout');
  redirect('/admin');
}

export async function signInWithGitHub() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = await getTrustedAppOrigin();

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
