'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true } | { ok: false; error: string };

export type StaffProfileEdit = {
  full_name: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  department?: string;
  position?: string;
  bio?: string;
  avatar_url?: string;
};

export async function updateMyStaffProfile(input: StaffProfileEdit): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Chưa đăng nhập' };
  const { error } = await supabase.from('staff_profiles').update(input as never).eq('id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/profile');
  revalidatePath('/admin');
  return { ok: true };
}

export async function toggleStaffStatus(staffId: string, isActive: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('staff_profiles')
    .update({ is_active: isActive } as never)
    .eq('id', staffId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/users');
  return { ok: true };
}

export async function updateStaffRole(staffId: string, roleId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('staff_profiles')
    .update({ role_id: roleId } as never)
    .eq('id', staffId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/users');
  return { ok: true };
}
