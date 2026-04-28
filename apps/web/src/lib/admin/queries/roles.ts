import { createClient } from '@/lib/supabase/server';

export type Permission = {
  id: string;
  module: string;
  action: string;
  description: string;
};

export type RoleWithPermissions = {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissionIds: string[];
};

export async function listAllRoles() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('roles')
    .select('id, name, display_name, description')
    .order('display_name');
  return data ?? [];
}

export async function listPermissions(): Promise<Permission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('permissions')
    .select('id, module, action, description')
    .order('module')
    .order('action');
  return (data ?? []) as Permission[];
}

export async function getRolePermissions(roleId: string): Promise<string[]> {
  const supabase = await createClient();
  type RpRow = { permission_id: string };
  const { data } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', roleId);
  return ((data ?? []) as RpRow[]).map((r) => r.permission_id);
}

export type RoleBasic = { id: string; name: string; display_name: string; description: string };

export async function listRolesWithPermissions(): Promise<RoleWithPermissions[]> {
  const roles = (await listAllRoles()) as unknown as RoleBasic[];
  const result: RoleWithPermissions[] = [];
  for (const r of roles) {
    const ids = await getRolePermissions(r.id);
    result.push({
      id: r.id,
      name: r.name,
      display_name: r.display_name,
      description: r.description,
      permissionIds: ids,
    });
  }
  return result;
}
