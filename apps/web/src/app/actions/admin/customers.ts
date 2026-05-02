'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true } | { ok: false; error: string };

export type CustomerEditInput = {
  id: string;
  full_name: string;
  username: string;
};

type HasPermissionRpc = (
  fn: 'has_permission',
  args: { p_module: string; p_action: string },
) => Promise<{ data: boolean | null; error: { message: string } | null }>;

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
