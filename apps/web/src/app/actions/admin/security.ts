'use server';

import { createClient } from '@/lib/supabase/server';
import { audit } from '@/lib/security/auditLog';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function changePassword(prevState: any, formData: FormData) {
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!currentPassword || !newPassword) {
    return { error: 'Vui lòng nhập đầy đủ thông tin.' };
  }

  if (newPassword.length < 8) {
    return { error: 'Mật khẩu mới phải từ 8 ký tự trở lên.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: 'Không tìm thấy phiên đăng nhập.' };
  }

  // Verify current password by signing in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: 'Mật khẩu hiện tại không chính xác.' };
  }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  const h = await headers();
  const ctx = {
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
    userAgent: h.get('user-agent'),
  };

  if (updateError) {
    await audit({ action: 'auth.password_change_failed', severity: 'warn', details: { reason: updateError.message } }, ctx);
    return { error: 'Đổi mật khẩu thất bại: ' + updateError.message };
  }

  await audit({ action: 'auth.password_changed', severity: 'info' }, ctx);

  return { ok: true, message: 'Đổi mật khẩu thành công.' };
}

export async function unenrollMfa(factorId: string) {
  if (!factorId) return { error: 'Thiếu factor ID' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Không tìm thấy phiên đăng nhập.' };
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  const h = await headers();
  const ctx = {
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
    userAgent: h.get('user-agent'),
  };

  if (error) {
    await audit({ action: 'auth.mfa_unenroll_failed', severity: 'warn', details: { reason: error.message } }, ctx);
    return { error: 'Không thể tắt 2FA: ' + error.message };
  }

  await audit({ action: 'auth.mfa_unenrolled', severity: 'warn' }, ctx);

  revalidatePath('/admin/profile');
  return { ok: true };
}
