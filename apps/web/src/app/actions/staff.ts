'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/admin/audit';

type StaffInvitationWriteClient = {
  upsert: (
    row: {
      email: string;
      role_id: string;
      full_name: string;
      status: 'pending';
      invited_by: string | null;
    },
    options: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
  update: (row: { status: 'revoked' }) => {
    eq: (column: 'id', value: string) => Promise<{ error: { message: string } | null }>;
  };
};

type StaffProfileWriteClient = {
  update: (row: { is_active: boolean }) => {
    eq: (column: 'id', value: string) => Promise<{ error: { message: string } | null }>;
  };
};

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
    return { error: 'Quyền truy cập bị từ chối. Chỉ Super Admin mới có quyền mời nhân sự.' };
  }

  const { data: role } = (await supabase
    .from('roles')
    .select('id, display_name')
    .eq('name', roleName)
    .single()) as any;

  if (!role) return { error: `Vai trò "${roleName}" không tồn tại.` };

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await (
    supabase.from('staff_invitations') as any
  ).upsert(
    {
      email,
      role_id: role.id,
      full_name: fullName,
      status: 'pending',
      invited_by: user?.id ?? null,
    },
    { onConflict: 'email' },
  );

  if (error) return { error: 'Không thể tạo lời mời: ' + error.message };

  await logAction({
    resource_type: 'staff',
    action: 'Invite Staff',
    entity: fullName,
    summary: `Mời nhân viên mới: ${fullName} (${email}) với vai trò ${role.display_name}`
  });

  await supabase.rpc('sweep_pending_invitations');

  revalidatePath('/admin/users');
  return { success: `Đã mời ${email} với vai trò ${role.display_name}.` };
}

export async function revokeStaffInvitation(invitationId: string) {
  const supabase = await createClient();

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) {
    return { error: 'Chỉ Super Admin mới được phép thu hồi lời mời.' };
  }

  const { data: inv } = (await supabase.from('staff_invitations').select('email, full_name').eq('id', invitationId).maybeSingle()) as any;

  const { error } = await (
    supabase.from('staff_invitations') as any
  )
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (error) return { error: error.message };

  await logAction({
    resource_type: 'staff',
    action: 'Revoke Invitation',
    entity: inv?.full_name || inv?.email,
    summary: `Thu hồi lời mời của: ${inv?.full_name} (${inv?.email})`
  });

  revalidatePath('/admin/users');
  return { success: 'Đã thu hồi lời mời.' };
}

export async function deactivateStaff(staffId: string) {
  const supabase = await createClient();

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) {
    return { error: 'Chỉ Super Admin mới được phép vô hiệu hóa nhân sự.' };
  }

  const { data: p } = (await supabase.from('staff_profiles').select('full_name, email').eq('id', staffId).maybeSingle()) as any;

  const { error } = await (
    supabase.from('staff_profiles') as any
  )
    .update({ is_active: false })
    .eq('id', staffId);

  if (error) return { error: error.message };

  await logAction({
    resource_type: 'staff',
    resource_id: staffId,
    action: 'Deactivate Staff',
    entity: p?.full_name,
    summary: `Vô hiệu hóa nhân sự: ${p?.full_name} (${p?.email})`
  });

  revalidatePath('/admin/users');
  return { success: 'Đã vô hiệu hóa nhân sự.' };
}
