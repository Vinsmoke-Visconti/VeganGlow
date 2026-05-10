'use server';

import { createClient } from '@/lib/supabase/server';

type PermissionResult =
  | { authorized: true }
  | { authorized: false; error: string };

type HasPermissionRpc = (
  fn: 'has_permission',
  args: { p_module: string; p_action: string },
) => Promise<{ data: boolean | null; error: { message: string } | null }>;

/**
 * Shared permission guard for admin Server Actions.
 * Checks RBAC permission OR super_admin status before allowing mutations.
 *
 * Usage:
 *   const guard = await requirePermission('products', 'write');
 *   if (!guard.authorized) return { ok: false, error: guard.error };
 */
export async function requirePermission(
  module: string,
  action: string,
): Promise<PermissionResult> {
  const supabase = await createClient();
  const hasPermission = supabase.rpc.bind(supabase) as unknown as HasPermissionRpc;

  const [permissionRes, superAdminRes] = await Promise.all([
    hasPermission('has_permission', { p_module: module, p_action: action }),
    supabase.rpc('is_super_admin'),
  ]);

  if (permissionRes.error) return { authorized: false, error: permissionRes.error.message };
  if (superAdminRes.error) return { authorized: false, error: superAdminRes.error.message };

  const canDo = Boolean(permissionRes.data);
  const isSuperAdmin = Boolean(superAdminRes.data);

  if (!canDo && !isSuperAdmin) {
    return { authorized: false, error: `Bạn không có quyền ${action} ${module}.` };
  }

  return { authorized: true };
}

/**
 * Guard that requires super_admin role specifically.
 * Use for sensitive operations like managing roles/permissions.
 */
export async function requireSuperAdmin(): Promise<PermissionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('is_super_admin');

  if (error) return { authorized: false, error: error.message };
  if (!data) return { authorized: false, error: 'Chỉ super admin mới có quyền thực hiện thao tác này.' };

  return { authorized: true };
}
