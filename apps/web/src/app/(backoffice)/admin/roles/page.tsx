import { listPermissions, listRolesWithPermissions } from '@/lib/admin/queries/roles';
import { listStaff, getMyStaffProfile } from '@/lib/admin/queries/staff';
import { PermissionMatrix } from './_components/PermissionMatrix';
import shared from '../admin-shared.module.css';

export default async function AdminRoles() {
  const [permissions, roles, staff, currentUser] = await Promise.all([
    listPermissions(), 
    listRolesWithPermissions(),
    listStaff(),
    getMyStaffProfile()
  ]);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Phân quyền hệ thống</h1>
          <p className={shared.pageSubtitle}>
            Cấu hình quyền hạn cho từng vai trò hoặc trực tiếp cho từng tài khoản nhân sự.
          </p>
        </div>
      </div>

      <PermissionMatrix roles={roles} permissions={permissions} staff={staff} currentUser={currentUser} />
    </div>
  );
}
