'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { audit } from '@/lib/security/auditLog';

async function auditCtx() {
  const h = await headers();
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
    userAgent: h.get('user-agent'),
  };
}

type StaffInvitationWriteClient = {
  upsert: (
    row: {
      email: string;
      role_id: string;
      full_name: string;
      status: 'pending';
      invited_by: string | null;
      token: string;
      expires_at: string;
    },
    options: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
  update: (row: { status: 'revoked' | 'declined' | 'accepted' }) => {
    eq: (column: 'id' | 'token', value: string) => Promise<{ error: { message: string } | null }>;
  };
};

type RoleRow = { id: string; display_name: string };

type StaffProfileWriteClient = {
  update: (row: { is_active: boolean }) => {
    eq: (column: 'id', value: string) => Promise<{ error: { message: string } | null }>;
  };
};

import { sendStaffInvitationEmail } from '@/lib/email';

/**
 * Super Admin invites a staff member by email.
 */
export async function inviteStaff(prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const fullName = (formData.get('fullName') as string)?.trim();
  const roleName = (formData.get('roleName') as string) || 'staff';

  if (!email || !fullName) {
    return { error: 'Vui lòng nhập đầy đủ email và họ tên.' };
  }

  const supabase = await createClient();

  const { data: isSuperAdmin, error: authError } = await supabase.rpc('is_super_admin');
  if (authError || !isSuperAdmin) {
    return { error: 'Quyền truy cập bị từ chối. Chỉ Super Admin mới có quyền mời nhân sự.' };
  }

  const { data: roleData, error: roleErr } = await supabase
    .from('roles')
    .select('id, display_name')
    .eq('name', roleName)
    .single();

  const role = roleData as RoleRow | null;

  if (roleErr || !role) {
    return { error: `Vai trò "${roleName}" không tồn tại.` };
  }

  const token = crypto.randomUUID();
  const { data: { user } } = await supabase.auth.getUser();

  // Save to database
  const { error } = await (
    supabase.from('staff_invitations') as unknown as StaffInvitationWriteClient
  ).upsert(
    {
      email,
      role_id: role.id,
      full_name: fullName,
      status: 'pending',
      invited_by: user?.id ?? null,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: 'email' }
  );

  if (error) {
    console.error('Staff Invitation Error:', error);
    return { error: 'Không thể tạo lời mời: ' + error.message };
  }

  revalidatePath('/admin/users');

  // Send the email
  try {
    await sendStaffInvitationEmail(email, fullName, role.display_name, token);
  } catch (emailErr) {
    console.error('Failed to send invitation email:', emailErr);
    return { success: `Đã tạo lời mời cho ${email} nhưng không thể gửi email tự động. Vui lòng copy link trong phần "Xem lời mời".` };
  }
  await audit(
    {
      action: 'rbac.staff_invited',
      severity: 'warn',
      entity: 'staff',
      entity_id: email,
      details: { role: roleName, full_name: fullName },
    },
    await auditCtx()
  );

  return { success: `Đã mời ${email} với vai trò ${role.display_name}. Một email thông báo đã được gửi đi.` };
}

export async function revokeStaffInvitation(invitationId: string) {
  const supabase = await createClient();

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) {
    return { error: 'Chỉ Super Admin mới được phép thu hồi lời mời.' };
  }

  const { error } = await (
    supabase.from('staff_invitations') as unknown as StaffInvitationWriteClient
  )
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  await audit(
    { action: 'rbac.role_revoked', severity: 'warn', entity: 'staff', entity_id: invitationId, details: { kind: 'invitation' } },
    await auditCtx()
  );
  return { success: 'Đã thu hồi lời mời.' };
}

export async function deactivateStaff(staffId: string) {
  const supabase = await createClient();

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) {
    return { error: 'Chỉ Super Admin mới được phép vô hiệu hóa nhân sự.' };
  }

  const { error } = await (
    supabase.from('staff_profiles') as unknown as StaffProfileWriteClient
  )
    .update({ is_active: false })
    .eq('id', staffId);

  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  await audit(
    { action: 'rbac.staff_disabled', severity: 'warn', entity: 'staff', entity_id: staffId, details: {} },
    await auditCtx()
  );
  return { success: 'Đã vô hiệu hóa nhân sự.' };
}

/**
 * Invitee declines the invitation.
 */
export async function declineStaffInvitation(token: string) {
  const supabase = await createClient();

  // Find invitation first to audit it
  const { data: invite, error: fetchError } = await (supabase
    .from('staff_invitations') as any)
    .select('*')
    .eq('token', token)
    .single();

  if (!invite) return { error: 'Không tìm thấy lời mời.' };

  const { error } = await (
    supabase.from('staff_invitations') as unknown as StaffInvitationWriteClient
  )
    .update({ status: 'declined' })
    .eq('token', token);

  if (error) return { error: error.message };

  await audit(
    {
      action: 'rbac.staff_invitation_declined',
      severity: 'warn',
      entity: 'staff',
      entity_id: invite.email,
      details: { full_name: invite.full_name },
    },
    await auditCtx()
  );

  return { success: 'Đã từ chối lời mời.' };
}
