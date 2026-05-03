'use client';

import { useState, useTransition, useRef } from 'react';
import { Loader2, Send, X, UserPlus, CheckCircle, AlertTriangle } from 'lucide-react';
import { inviteStaff } from '@/app/actions/staff';
import shared from '../../admin-shared.module.css';

type Role = { id: string; name: string; display_name: string };

type InviteState = { error?: string; success?: string } | undefined;

export function InviteStaffForm({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<InviteState>(undefined);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setState(undefined), 300); // Reset state after animation
  };

  const handleOpen = () => {
    setState(undefined);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await inviteStaff(undefined, formData);
      setState(result);
      if (result?.success && formRef.current) {
        formRef.current.reset();
      }
    });
  };

  return (
    <>
      <button type="button" className={`${shared.btn} ${shared.btnPrimary}`} onClick={handleOpen}>
        <UserPlus size={14} /> Mời nhân sự
      </button>

      {open && (
        <div className={shared.modalBackdrop} onClick={handleClose}>
          <div className={shared.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>Mời nhân sự mới</h3>
              <button
                type="button"
                onClick={handleClose}
                className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>
            <form ref={formRef} onSubmit={handleSubmit}>
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
                {state?.success ? (
                  <button
                    type="button"
                    onClick={handleClose}
                    className={`${shared.btn} ${shared.btnPrimary}`}
                    style={{ width: '100%' }}
                  >
                    Hoàn tất
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleClose}
                      className={`${shared.btn} ${shared.btnGhost}`}
                    >
                      Hủy
                    </button>
                    <button type="submit" disabled={isPending} className={`${shared.btn} ${shared.btnPrimary}`}>
                      {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Gửi lời mời
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

