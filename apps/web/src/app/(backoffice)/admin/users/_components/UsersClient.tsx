'use client';

import { useState } from 'react';
import { Users, Mail, Shield, MapPin, Calendar, MoreVertical } from 'lucide-react';
import { formatDateShort } from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';
import { AdminViewSwitcher, ViewMode } from '../../_components/AdminViewSwitcher';
import { StaffActions } from './StaffActions';

type Staff = {
  id: string;
  full_name: string | null;
  email: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  role: { display_name: string } | null;
};

type Props = {
  staff: Staff[];
};

export function UsersClient({ staff }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  return (
    <>
      <div className={shared.toolbar}>
        <AdminViewSwitcher mode={viewMode} onChange={setViewMode} />
        <div />
      </div>

      {staff.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Users size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có nhân sự</p>
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
      ) : (
        <div className={shared.cardGrid} style={{ marginBottom: 24 }}>
          {staff.map((s) => (
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
                <StaffActions id={s.id} isActive={s.is_active} />
              </div>
              <div className={shared.adminCardContent}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--vg-ink-700)' }}>
                    <Mail size={14} className={shared.iconMuted} />
                    {s.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--vg-ink-700)' }}>
                    <Shield size={14} className={shared.iconMuted} />
                    Phòng: {s.department || '—'}
                  </div>
                </div>
              </div>
              <div className={shared.adminCardFooter}>
                <span className={`${shared.badge} ${s.is_active ? shared.badgeSuccess : shared.badgeMuted}`}>
                  {s.is_active ? 'Đang hoạt động' : 'Vô hiệu'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--vg-ink-400)' }}>
                  Gia nhập: {formatDateShort(s.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
