'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true } | { ok: false; error: string };

export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<Result> {
  const supabase = await createClient();

  const { data: role, error: roleErr } = await supabase
    .from('roles')
    .select('name')
    .eq('id', roleId)
    .maybeSingle();
  if (roleErr) return { ok: false, error: roleErr.message };
  if ((role as { name: string } | null)?.name === 'super_admin') {
    return { ok: false, error: 'Không thể chỉnh quyền của super_admin' };
  }

  const { error: delErr } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
  if (delErr) return { ok: false, error: delErr.message };

  if (permissionIds.length > 0) {
    const rows = permissionIds.map((permission_id) => ({ role_id: roleId, permission_id }));
    const { error: insErr } = await supabase.from('role_permissions').insert(rows as never);
    if (insErr) return { ok: false, error: insErr.message };
  }
  revalidatePath('/admin/roles');
  return { ok: true };
}
