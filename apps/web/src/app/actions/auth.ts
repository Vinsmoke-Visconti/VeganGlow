'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { sendPasswordOtpEmail } from '@/lib/email';
import { logAction } from '@/lib/admin/audit';

export type AuthFormState = { error?: string } | null;

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
  let identifier = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = safeRedirectPath(formData.get('redirectTo'));

  const supabase = await createClient();

  if (!identifier.includes('@')) {
    const getEmailFromUsername = supabase.rpc.bind(supabase) as unknown as RpcUsernameToEmail;
    const { data: resolvedEmail } = await getEmailFromUsername(
      'get_email_from_username',
      { p_username: identifier }
    );
    if (resolvedEmail) {
      identifier = resolvedEmail;
    }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

export async function signup(_prevState: AuthFormState, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

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
    return { error: error.message };
  }

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
  let identifier = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();

  if (!identifier.includes('@')) {
    const getEmailFromUsername = supabase.rpc.bind(supabase) as any;
    const { data: resolvedEmail } = await getEmailFromUsername(
      'get_email_from_username',
      { p_username: identifier }
    );
    if (resolvedEmail) {
      identifier = resolvedEmail;
    }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password,
  });

  if (error) {
    return { error: 'Tài khoản không có quyền truy cập hoặc mật khẩu không chính xác.' };
  }

  const { data: isStaff } = await supabase.rpc('is_staff');

  if (!isStaff) {
    await supabase.auth.signOut();
    return { error: 'Tài khoản không có quyền truy cập hoặc mật khẩu không chính xác.' };
  }

  await logAction({
    resource_type: 'auth',
    action: 'Admin Login',
    summary: `Nhân sự đăng nhập hệ thống: ${identifier}`
  });

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
