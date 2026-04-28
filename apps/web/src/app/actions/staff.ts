'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Super Admin invites a staff member by email. The user does NOT need to exist
 * in auth.users yet — they'll be auto-promoted on first login (Google or
 * email/password) by the on_auth_user_created trigger.
 */
export async function inviteStaff(prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const fullName = (formData.get('fullName') as string)?.trim();
  const roleName = (formData.get('roleName') as string) || 'customer_support';

  if (!email || !fullName) {
    return { error: 'Vui lòng nhập đầy đủ email và họ tên.' };
  }

  const supabase = await createClient();

  const { data: isSuperAdmin, error: authError } = await supabase.rpc('is_super_admin');
  if (authError || !isSuperAdmin) {
    console.error('Staff Action Authorization Error:', authError);
    return { error: 'Quyền truy cập bị từ chối. Chỉ Super Admin mới có quyền mời nhân sự.' };
  }

  const { data: role, error: roleErr } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single();

  if (roleErr || !role) {
    return { error: `Vai trò "${roleName}" không tồn tại.` };
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await (supabase.from('staff_invitations') as any).upsert(
    {
      email,
      role_id: (role as { id: string }).id,
      full_name: fullName,
      status: 'pending',
      invited_by: user?.id ?? null,
    },
    { onConflict: 'email' },
  );

  if (error) {
    console.error('Staff Invitation Error:', error);
    return { error: 'Không thể tạo lời mời: ' + error.message };
  }

  // If the invitee already has an auth.users row (e.g. signed up earlier as a
  // customer), promote them right away so they don't have to log out/in.
  await supabase.rpc('sweep_pending_invitations');

  revalidatePath('/admin/users');
  return { success: `Đã mời ${email} với vai trò ${roleName}.` };
}

export async function revokeStaffInvitation(invitationId: string) {
  const supabase = await createClient();

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) {
    return { error: 'Chỉ Super Admin mới được phép thu hồi lời mời.' };
  }

  const { error } = await (supabase.from('staff_invitations') as any)
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  return { success: 'Đã thu hồi lời mời.' };
}

export async function deactivateStaff(staffId: string) {
  const supabase = await createClient();

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) {
    return { error: 'Chỉ Super Admin mới được phép vô hiệu hóa nhân sự.' };
  }

  const { error } = await (supabase.from('staff_profiles') as any)
    .update({ is_active: false })
    .eq('id', staffId);

  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  return { success: 'Đã vô hiệu hóa nhân sự.' };
}
