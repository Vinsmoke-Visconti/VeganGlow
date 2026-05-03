import { createClient } from '@/lib/supabase/server';

type RolePermissionRow = {
  permission: { module: string; action: string } | null;
};

type StaffWithPermsRow = {
  role: { role_permissions: RolePermissionRow[] | null } | null;
};

export async function getCurrentStaffPermissions(): Promise<string[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await (supabase
    .from('profiles') as any)
    .select('role:roles(role_permissions(permission:permissions(module, action)))')
    .eq('id', user.id)
    .maybeSingle();

  const rp = data?.role?.role_permissions ?? [];
  return (rp as any[])
    .map((r: any) => r.permission)
    .filter((p): p is { module: string; action: string } => Boolean(p))
    .map((p) => `${p.module}:${p.action}`);
}

export function can(permissions: string[], required: string): boolean {
  return permissions.includes(required);
}
