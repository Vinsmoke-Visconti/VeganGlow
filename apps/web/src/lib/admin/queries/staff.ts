import { createClient } from '@/lib/supabase/server';

export type StaffRow = {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  position: string | null;
  is_active: boolean;
  created_at: string;
  role: { id: string; name: string; display_name: string; weight: number } | null;
};

export type InvitationRow = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  invited_at: string;
  role: { display_name: string } | null;
  token: string;
};

export type RoleRow = { id: string; name: string; display_name: string };

export async function listStaff(): Promise<StaffRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('staff_profiles')
    .select('id, full_name, email, department, position, is_active, created_at, role:roles(id, name, display_name, weight)')
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as StaffRow[];
}

export async function listInvitations(): Promise<InvitationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('staff_invitations')
    .select('id, email, full_name, status, invited_at, token, role:roles(display_name)')
    .order('invited_at', { ascending: false });
  return (data ?? []) as unknown as InvitationRow[];
}

export async function listRoles(): Promise<RoleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('roles').select('id, name, display_name').order('display_name');
  return (data ?? []) as RoleRow[];
}

export async function getMyStaffProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('staff_profiles')
    .select('id, full_name, first_name, last_name, username, email, department, position, bio, avatar_url, role:roles(id, name, display_name, weight)')
    .eq('id', user.id)
    .maybeSingle();
  return data;
}
