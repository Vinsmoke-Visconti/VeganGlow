'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true } | { ok: false; error: string };

export type CustomerEditInput = {
  id: string;
  full_name: string;
  username: string;
  otp_code: string;
};

type HasPermissionRpc = (
  fn: 'has_permission',
  args: { p_module: string; p_action: string },
) => Promise<{ data: boolean | null; error: { message: string } | null }>;

export async function requestCustomerEditOtp(userId: string): Promise<Result> {
  const supabase = await createClient();

  const hasPermission = supabase.rpc.bind(supabase) as unknown as HasPermissionRpc;
  const [permRes, superRes] = await Promise.all([
    hasPermission('has_permission', { p_module: 'users', p_action: 'write' }),
    supabase.rpc('is_super_admin'),
  ]);

  if (!permRes.data && !superRes.data) {
    return { ok: false, error: 'Bạn không có quyền thao tác.' };
  }

  // Use service role to get the user's email from auth.users
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const adminAuthClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: userData, error: userError } = await adminAuthClient.auth.admin.getUserById(userId);
  if (userError || !userData || !userData.user || !userData.user.email) {
    return { ok: false, error: 'Không tìm thấy Email của khách hàng này để gửi OTP.' };
  }
  const email = userData.user.email;

  // Generate 6 digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiration to 5 minutes from now
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);

  const { error } = await supabase.from('customer_edit_otps').insert({
    user_id: userId,
    otp_code: otpCode,
    expires_at: expiresAt.toISOString(),
  } as never);

  if (error) {
    return { ok: false, error: 'Lỗi khi tạo mã OTP: ' + error.message };
  }

  // Send Email
  try {
    const { sendCustomerEditOtpEmail } = await import('@/lib/email');
    await sendCustomerEditOtpEmail(email, otpCode);
  } catch (err: any) {
    return { ok: false, error: 'Lỗi khi gửi email: ' + err.message };
  }

  return { ok: true };
}

export async function updateCustomerProfile(input: CustomerEditInput): Promise<Result> {
  const supabase = await createClient();

  // Defense-in-depth: explicit permission check (RLS is the final backstop)
  const hasPermission = supabase.rpc.bind(supabase) as unknown as HasPermissionRpc;
  const [permRes, superRes] = await Promise.all([
    hasPermission('has_permission', { p_module: 'users', p_action: 'write' }),
    supabase.rpc('is_super_admin'),
  ]);

  if (!permRes.data && !superRes.data) {
    return { ok: false, error: 'Bạn không có quyền chỉnh sửa thông tin khách hàng.' };
  }

  // Verify OTP
  const { data: otpRecords } = await supabase
    .from('customer_edit_otps')
    .select('*')
    .eq('user_id', input.id)
    .eq('otp_code', input.otp_code)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (!otpRecords || otpRecords.length === 0) {
    return { ok: false, error: 'Mã OTP không hợp lệ hoặc đã hết hạn.' };
  }

  // Mark OTP as used
  await supabase.from('customer_edit_otps').update({ used: true } as never).eq('id', (otpRecords as any)[0].id);

  const { error } = await supabase
    .from('profiles')
    .update({ 
      full_name: input.full_name || null,
      username: input.username || null,
    } as never)
    .eq('id', input.id);
  
  if (error) return { ok: false, error: error.message };
  
  revalidatePath(`/admin/customers/${input.id}`);
  revalidatePath('/admin/customers');
  return { ok: true };
}
