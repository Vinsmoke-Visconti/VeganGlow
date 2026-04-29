'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { Loader2, Send, X, UserPlus, CheckCircle, AlertTriangle } from 'lucide-react';
import { inviteStaff } from '@/app/actions/staff';
import shared from '../../admin-shared.module.css';

type Role = { id: string; name: string; display_name: string };

type InviteState = { error?: string; success?: string } | undefined;

const initialState: InviteState = undefined;

export function InviteStaffForm({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(inviteStaff, initialState);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state?.success) {
      const t = setTimeout(() => setOpen(false), 1200);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <>
      <button type="button" className={`${shared.btn} ${shared.btnPrimary}`} onClick={() => setOpen(true)}>
        <UserPlus size={14} /> Mời nhân sự
      </button>

      {open && (
        <div className={shared.modalBackdrop} onClick={() => setOpen(false)}>
          <div className={shared.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>Mời nhân sự mới</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>
            <form
              action={(fd) => startTransition(() => formAction(fd))}
            >
              <div className={shared.modalBody}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Họ tên</label>
                  <input className={shared.formInput} name="fullName" required />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Email</label>
                  <input className={shared.formInput} name="email" type="email" required />
                  <p className={shared.formHint}>Họ sẽ đăng nhập bằng Google với email này.</p>
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Vai trò</label>
                  <select className={shared.formSelect} name="roleName" defaultValue="customer_support">
                    {roles
                      .filter((r) => r.name !== 'super_admin' && r.name !== 'customer')
                      .map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.display_name}
                        </option>
                      ))}
                  </select>
                </div>

                {state?.error && (
                  <p className={shared.formError}>
                    <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {state.error}
                  </p>
                )}
                {state?.success && (
                  <p style={{ color: 'var(--vg-success-fg)', fontSize: 13 }}>
                    <CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {state.success}
                  </p>
                )}
              </div>
              <div className={shared.modalFooter}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={`${shared.btn} ${shared.btnGhost}`}
                >
                  Hủy
                </button>
                <button type="submit" disabled={isPending} className={`${shared.btn} ${shared.btnPrimary}`}>
                  {isPending ? <Loader2 size={14} /> : <Send size={14} />} Gửi lời mời
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
