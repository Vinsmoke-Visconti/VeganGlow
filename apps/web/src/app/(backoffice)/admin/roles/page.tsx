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


      <PermissionMatrix roles={roles} permissions={permissions} staff={staff} currentUser={currentUser} />
    </div>
  );
}
