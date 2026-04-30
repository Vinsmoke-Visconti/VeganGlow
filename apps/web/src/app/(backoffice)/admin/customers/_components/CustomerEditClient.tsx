'use client';

import { useState, useTransition } from 'react';
import { Edit, X, Loader2 } from 'lucide-react';
import { updateCustomerProfile } from '@/app/actions/admin/customers';
import shared from '../../admin-shared.module.css';

type CustomerEditProps = {
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
  };
};

export function CustomerEditClient({ profile }: CustomerEditProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: profile.full_name || '',
    username: profile.username || '',
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    start(async () => {
      const res = await updateCustomerProfile({
        id: profile.id,
        full_name: form.full_name.trim(),
        username: form.username.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${shared.btn} ${shared.btnGhost}`}
        style={{ width: 32, height: 32, padding: 0 }}
        title="Chỉnh sửa thông tin"
      >
        <Edit size={14} />
      </button>

      {open && (
        <div className={shared.modalBackdrop} onClick={() => setOpen(false)}>
          <div className={shared.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>Chỉnh sửa Khách hàng</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
              >
                <X size={16} />
              </button>
            </div>
            <div className={shared.modalBody}>
              <div className={shared.formField}>
                <label className={shared.formLabel}>Họ và tên</label>
                <input
                  className={shared.formInput}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div className={shared.formField}>
                <label className={shared.formLabel}>Tên đăng nhập (Username)</label>
                <input
                  className={shared.formInput}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
              {error && <p className={shared.formError}>{error}</p>}
            </div>
            <div className={shared.modalFooter}>
              <button type="button" onClick={() => setOpen(false)} className={`${shared.btn} ${shared.btnGhost}`}>
                Hủy
              </button>
              <button type="button" onClick={save} disabled={pending} className={`${shared.btn} ${shared.btnPrimary}`}>
                {pending ? <Loader2 size={14} /> : null} Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
