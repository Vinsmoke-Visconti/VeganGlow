import { listStaff, listInvitations, listRoles } from '@/lib/admin/queries/staff';
import { formatDateShort } from '@/lib/admin/format';
import shared from '../admin-shared.module.css';
import { InviteStaffForm } from './_components/InviteStaffForm';
import { UsersClient } from './_components/UsersClient';

export default async function AdminUsers() {
  const [staff, invitations, roles] = await Promise.all([listStaff(), listInvitations(), listRoles()]);

  return (
    <div className={shared.page}>
      <div className={shared.toolbar}>
        <div style={{ flex: 1 }} />
        <InviteStaffForm roles={roles} />
      </div>

      <UsersClient staff={staff} />

      {invitations.length > 0 && (
        <>
          <h2
            style={{
              fontFamily: 'var(--vg-font-display)',
              fontSize: 'var(--vg-text-lg)',
              marginBottom: 'var(--vg-space-3)',
              color: 'var(--vg-ink-900)'
            }}
          >
            Lời mời đang chờ ({invitations.filter(i => i.status === 'pending').length})
          </h2>
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày mời</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((i) => (
                  <tr key={i.id}>
                    <td>{i.full_name}</td>
                    <td>{i.email}</td>
                    <td>{i.role?.display_name ?? '—'}</td>
                    <td>
                      <span
                        className={`${shared.badge} ${
                          i.status === 'pending'
                            ? shared.badgePending
                            : i.status === 'accepted'
                            ? shared.badgeSuccess
                            : shared.badgeDanger
                        }`}
                      >
                        {i.status === 'pending'
                          ? 'Chờ phản hồi'
                          : i.status === 'accepted'
                          ? 'Đã chấp nhận'
                          : 'Đã thu hồi'}
                      </span>
                    </td>
                    <td>{formatDateShort(i.invited_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
