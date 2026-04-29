import { listPermissions, listRolesWithPermissions } from '@/lib/admin/queries/roles';
import { PermissionMatrix } from './_components/PermissionMatrix';
import shared from '../admin-shared.module.css';

export default async function AdminRoles() {
  const [permissions, roles] = await Promise.all([listPermissions(), listRolesWithPermissions()]);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Vai trò &amp; quyền</h1>
          <p className={shared.pageSubtitle}>
            Cấu hình quyền truy cập cho từng vai trò. {permissions.length} quyền · {roles.length} vai
            trò.
          </p>
        </div>
      </div>

      <PermissionMatrix roles={roles} permissions={permissions} />
    </div>
  );
}
