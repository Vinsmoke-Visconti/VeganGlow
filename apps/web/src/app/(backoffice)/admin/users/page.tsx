import { listStaff, listInvitations, listRoles } from '@/lib/admin/queries/staff';
import shared from '../admin-shared.module.css';
import { InviteStaffForm } from './_components/InviteStaffForm';
import { UsersClient } from './_components/UsersClient';

export default async function AdminUsers() {
  const [staff, invitations, roles] = await Promise.all([listStaff(), listInvitations(), listRoles()]);

  return (
    <div className={shared.page}>
      <div className={shared.toolbar}>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <InviteStaffForm roles={roles} />
        </div>
      </div>

      <UsersClient staff={staff} invitations={invitations} />
    </div>
  );
}
