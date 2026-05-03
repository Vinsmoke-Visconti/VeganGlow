'use client';

import { useState } from 'react';
import { Users, Mail, Shield, MapPin, Calendar, MoreVertical, Link as LinkIcon } from 'lucide-react';
import { formatDateShort } from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';
import { AdminViewSwitcher, ViewMode } from '../../_components/AdminViewSwitcher';
import { StaffActions } from './StaffActions';
import { CopyInviteLink } from './CopyInviteLink';

type Staff = {
  id: string;
  full_name: string | null;
  email: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  role: { display_name: string } | null;
};

type Invitation = {
  id: string;
  full_name: string;
  email: string;
  role: { display_name: string } | null;
  status: string;
  invited_at: string;
  token: string;
};

type Props = {
  staff: Staff[];
  invitations?: Invitation[];
};

export function UsersClient({ staff, invitations = [] }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');
  const allUsers = [
    ...staff.map((s) => ({ ...s, type: 'staff' as const })),
    ...pendingInvitations.map((i) => ({ ...i, type: 'invitation' as const })),
  ];

  return (
    <>
      <div className={shared.toolbar}>
        <AdminViewSwitcher mode={viewMode} onChange={setViewMode} />
        <div />
      </div>

      {allUsers.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Users size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có nhân sự hoặc lời mời nào</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={shared.tableWrap} style={{ marginBottom: 24 }}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Phòng ban</th>
                <th>Trạng thái</th>
                <th>Ngày gia nhập / Mời</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.full_name}</strong>
                  </td>
                  <td>{s.email}</td>
                  <td>{s.role?.display_name ?? '—'}</td>
                  <td>{s.type === 'staff' ? (s.department ?? '—') : '—'}</td>
                  <td>
                    {s.type === 'staff' ? (
                      <span
                        className={`${shared.badge} ${
                          s.is_active ? shared.badgeSuccess : shared.badgeMuted
                        }`}
                      >
                        {s.is_active ? 'Đang hoạt động' : 'Vô hiệu'}
                      </span>
                    ) : (
                      <span className={`${shared.badge} ${shared.badgeWarning}`}>
                        Đang chờ (Pending)
                      </span>
                    )}
                  </td>
                  <td>{formatDateShort(s.type === 'staff' ? s.created_at : s.invited_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {s.type === 'staff' ? (
                      <StaffActions id={s.id} isActive={s.is_active} />
                    ) : (
                      <CopyInviteLink token={s.token} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={shared.cardGrid} style={{ marginBottom: 24 }}>
          {allUsers.map((s) => (
            <div key={s.id} className={shared.adminCard}>
              <div className={shared.adminCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className={shared.emptyIcon} style={{ width: 40, height: 40, margin: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{s.full_name?.charAt(0) || 'U'}</span>
                  </div>
                  <div>
                    <h3 className={shared.adminCardTitle}>{s.full_name}</h3>
                    <span className={shared.adminCardSubtitle}>{s.role?.display_name || 'Nhân sự'}</span>
                  </div>
                </div>
                {s.type === 'staff' ? (
                  <StaffActions id={s.id} isActive={s.is_active} />
                ) : (
                  <CopyInviteLink token={s.token} />
                )}
              </div>
              <div className={shared.adminCardContent}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--vg-ink-700)' }}>
                    <Mail size={14} className={shared.iconMuted} />
                    {s.email}
                  </div>
                  {s.type === 'staff' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--vg-ink-700)' }}>
                      <Shield size={14} className={shared.iconMuted} />
                      Phòng: {s.department || '—'}
                    </div>
                  )}
                </div>
              </div>
              <div className={shared.adminCardFooter}>
                {s.type === 'staff' ? (
                  <span className={`${shared.badge} ${s.is_active ? shared.badgeSuccess : shared.badgeMuted}`}>
                    {s.is_active ? 'Đang hoạt động' : 'Vô hiệu'}
                  </span>
                ) : (
                  <span className={`${shared.badge} ${shared.badgeWarning}`}>
                    Đang chờ (Pending)
                  </span>
                )}
                <span style={{ fontSize: 11, color: 'var(--vg-ink-400)' }}>
                  {s.type === 'staff' ? 'Gia nhập: ' : 'Đã mời: '}
                  {formatDateShort(s.type === 'staff' ? s.created_at : s.invited_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
