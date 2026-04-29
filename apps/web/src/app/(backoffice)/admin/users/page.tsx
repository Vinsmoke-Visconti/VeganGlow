import { Users } from 'lucide-react';
import { listStaff, listInvitations, listRoles } from '@/lib/admin/queries/staff';
import { formatDateShort } from '@/lib/admin/format';
import shared from '../admin-shared.module.css';
import { InviteStaffForm } from './_components/InviteStaffForm';
import { StaffActions } from './_components/StaffActions';

export default async function AdminUsers() {
  const [staff, invitations, roles] = await Promise.all([listStaff(), listInvitations(), listRoles()]);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Nhân sự</h1>
          <p className={shared.pageSubtitle}>
            {staff.length} nhân sự · {invitations.filter((i) => i.status === 'pending').length} lời mời
            đang chờ
          </p>
        </div>
        <InviteStaffForm roles={roles} />
      </div>

      {staff.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Users size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có nhân sự</p>
        </div>
      ) : (
        <div className={shared.tableWrap} style={{ marginBottom: 24 }}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Phòng ban</th>
                <th>Trạng thái</th>
                <th>Tham gia</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.full_name}</strong>
                  </td>
                  <td>{s.email}</td>
                  <td>{s.role?.display_name ?? '—'}</td>
                  <td>{s.department ?? '—'}</td>
                  <td>
                    <span
                      className={`${shared.badge} ${
                        s.is_active ? shared.badgeSuccess : shared.badgeMuted
                      }`}
                    >
                      {s.is_active ? 'Đang hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td>{formatDateShort(s.created_at)}</td>
                  <td>
                    <StaffActions id={s.id} isActive={s.is_active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invitations.length > 0 && (
        <>
          <h2
            style={{
              fontFamily: 'var(--vg-font-display)',
              fontSize: 'var(--vg-text-lg)',
              marginBottom: 'var(--vg-space-3)',
            }}
          >
            Lời mời ({invitations.length})
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
