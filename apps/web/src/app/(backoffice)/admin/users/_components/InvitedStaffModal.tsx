'use client';

import { useState } from 'react';
import { Mail, Clock, Shield, X, Link as LinkIcon, ClipboardCheck } from 'lucide-react';
import { formatDateShort } from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';
import { CopyInviteLink } from './CopyInviteLink';

type Invitation = {
  id: string;
  full_name: string;
  email: string;
  role: { display_name: string } | null;
  status: string;
  invited_at: string;
  token: string;
};

export function InvitedStaffModal({ invitations }: { invitations: Invitation[] }) {
  const [open, setOpen] = useState(false);
  const pendingCount = invitations.filter(i => i.status === 'pending').length;

  if (invitations.length === 0) return null;

  return (
    <>
      <button 
        type="button" 
        className={`${shared.btn} ${shared.btnGhost}`}
        onClick={() => setOpen(true)}
      >
        <Mail size={14} /> Xem lời mời ({pendingCount})
      </button>

      {open && (
        <div className={shared.modalBackdrop} onClick={() => setOpen(false)}>
          <div className={`${shared.modalPanel} ${shared.modalLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>Danh sách lời mời đang chờ</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className={shared.modalBody} style={{ padding: 0 }}>
              <div className={shared.tableWrap} style={{ border: 'none', borderRadius: 0 }}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>Vai trò</th>
                      <th>Ngày mời</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{i.full_name}</div>
                        </td>
                        <td>{i.email}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Shield size={12} className={shared.iconMuted} />
                            {i.role?.display_name ?? '—'}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--vg-ink-500)', fontSize: 12 }}>
                            <Clock size={12} />
                            {formatDateShort(i.invited_at)}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {i.status === 'pending' && <CopyInviteLink token={i.token} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {invitations.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--vg-ink-500)' }}>
                  Không có lời mời nào đang chờ xử lý.
                </div>
              )}
            </div>
            
            <div className={shared.modalFooter}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${shared.btn} ${shared.btnPrimary}`}
                style={{ width: '100%' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
