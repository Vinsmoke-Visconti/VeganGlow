'use client';

import { useState, useTransition } from 'react';
import { Edit, X, Loader2 } from 'lucide-react';
import { updateCustomerProfile, requestCustomerEditOtp } from '@/app/actions/admin/customers';
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
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState({
    full_name: profile.full_name || '',
    username: profile.username || '',
  });
  const [otp, setOtp] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRequestOtp() {
    setError(null);
    start(async () => {
      const res = await requestCustomerEditOtp(profile.id);
      if (!res.ok) {
        setError(res.error || 'Failed to send OTP.');
        return;
      }
      setStep('otp');
    });
  }

  function save() {
    if (!otp.trim()) {
      setError('Vui lòng nhập mã OTP.');
      return;
    }
    setError(null);
    start(async () => {
      const res = await updateCustomerProfile({
        id: profile.id,
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        otp_code: otp.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setStep('form');
      setOtp('');
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
              {step === 'form' ? (
                <>
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
                  <p style={{ fontSize: 13, color: 'var(--vg-ink-500)', marginTop: 8 }}>
                    * Hệ thống sẽ gửi 1 mã OTP gồm 6 số vào Email của khách hàng. Vui lòng yêu cầu khách đọc mã để xác nhận sửa đổi.
                  </p>
                </>
              ) : (
                <>
                  <div className={shared.formField}>
                    <label className={shared.formLabel}>Mã xác nhận (OTP)</label>
                    <input
                      className={shared.formInput}
                      placeholder="Nhập 6 số OTP"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--vg-ink-500)', marginTop: 8 }}>
                    Đã gửi mã OTP đến email của khách hàng.
                  </p>
                </>
              )}
              {error && <p className={shared.formError} style={{ marginTop: 12 }}>{error}</p>}
            </div>
            
            <div className={shared.modalFooter}>
              <button type="button" onClick={() => setOpen(false)} className={`${shared.btn} ${shared.btnGhost}`}>
                Hủy
              </button>
              {step === 'form' ? (
                <button type="button" onClick={handleRequestOtp} disabled={pending} className={`${shared.btn} ${shared.btnPrimary}`}>
                  {pending ? <Loader2 size={14} /> : null} Gửi mã OTP cho Khách
                </button>
              ) : (
                <button type="button" onClick={save} disabled={pending} className={`${shared.btn} ${shared.btnPrimary}`}>
                  {pending ? <Loader2 size={14} /> : null} Lưu thay đổi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
