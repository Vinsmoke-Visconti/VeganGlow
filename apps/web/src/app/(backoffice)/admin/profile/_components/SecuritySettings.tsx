'use client';

import { useState, useTransition } from 'react';
import { Loader2, KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { changePassword, unenrollMfa } from '@/app/actions/admin/security';
import shared from '../../admin-shared.module.css';
import styles from '../profile.module.css';
import { useRouter } from 'next/navigation';

export function SecuritySettings({ mfaFactorId }: { mfaFactorId: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const [otpStep, setOtpStep] = useState<'initial' | 'sending' | 'verify'>('initial');
  const [cooldown, setCooldown] = useState(0);

  const handleRequestOtp = async () => {
    setError(null);
    setSuccess(null);
    setOtpStep('sending');
    const { requestPasswordOtp } = await import('@/app/actions/auth');
    const res = await requestPasswordOtp('change_password');
    if (res.error) {
      setError(res.error);
      setOtpStep('initial');
    } else {
      setSuccess('Mã OTP đã được gửi đến email của bạn.');
      setOtpStep('verify');
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  const handlePasswordChange = async (formData: FormData) => {
    setError(null);
    setSuccess(null);
    
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    formData.append('purpose', 'change_password');

    start(async () => {
      const { updatePasswordWithOtp } = await import('@/app/actions/auth');
      const res = await updatePasswordWithOtp(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess('Đổi mật khẩu thành công!');
        (document.getElementById('pwd-form') as HTMLFormElement)?.reset();
        setOtpStep('initial');
        setTimeout(() => setSuccess(null), 5000);
      }
    });
  };

  function handleUnenrollMfa() {
    if (!mfaFactorId) return;
    if (!confirm('Bạn có chắc chắn muốn tắt Xác thực 2 lớp? Việc này có thể làm giảm bảo mật tài khoản của bạn.')) return;

    setError(null);
    setSuccess(null);
    
    start(async () => {
      const res = await unenrollMfa(mfaFactorId);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess('Đã tắt Xác thực 2 lớp.');
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  }

  return (
    <section className={styles.card} style={{ marginTop: '24px' }}>
      <h3 className={styles.cardTitle} style={{ marginBottom: 16 }}>
        <KeyRound size={14} style={{ display: 'inline', marginRight: 6 }} />
        Bảo mật tài khoản
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Đổi mật khẩu */}
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--vg-ink-800)', marginBottom: 12 }}>
            Đổi mật khẩu
          </h4>
          
          {otpStep === 'initial' || otpStep === 'sending' ? (
            <div style={{ padding: 16, background: 'var(--vg-ink-50)', borderRadius: 8, border: '1px solid var(--vg-ink-200)' }}>
              <p style={{ fontSize: 13, color: 'var(--vg-ink-600)', marginBottom: 16, lineHeight: 1.5 }}>
                Để đổi mật khẩu, bạn cần xác minh danh tính bằng mã OTP gửi về email của bạn.
              </p>
              <button 
                type="button" 
                className={`${shared.btn} ${shared.btnPrimary}`} 
                onClick={handleRequestOtp}
                disabled={otpStep === 'sending' || cooldown > 0}
              >
                {otpStep === 'sending' ? <Loader2 size={14} className="animate-spin" /> : null} 
                {cooldown > 0 ? `Đợi ${cooldown}s để gửi lại` : 'Gửi mã OTP qua Email'}
              </button>
            </div>
          ) : (
            <form id="pwd-form" action={handlePasswordChange}>
              <div className={shared.formRow}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Mã OTP từ Email</label>
                  <input
                    type="text"
                    name="otpCode"
                    className={shared.formInput}
                    placeholder="Nhập mã 6 số"
                    required
                    maxLength={6}
                    autoComplete="off"
                  />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    name="currentPassword"
                    className={shared.formInput}
                    required
                  />
                </div>
              </div>
              
              <div className={shared.formRow}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Mật khẩu mới</label>
                  <input
                    type="password"
                    name="newPassword"
                    className={shared.formInput}
                    required
                    minLength={8}
                  />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className={shared.formInput}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button type="submit" className={`${shared.btn} ${shared.btnPrimary}`} disabled={pending}>
                  {pending ? <Loader2 size={14} className="animate-spin" /> : null} Xác nhận đổi mật khẩu
                </button>
                <button 
                  type="button" 
                  className={shared.btnSecondary} 
                  onClick={() => setOtpStep('initial')}
                  disabled={pending}
                  style={{ fontSize: 13 }}
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--vg-ink-200)' }} />

        {/* 2FA */}
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--vg-ink-800)', marginBottom: 8 }}>
            Xác thực 2 lớp (2FA/TOTP)
          </h4>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--vg-ink-50)', padding: 16, borderRadius: 8, border: '1px solid var(--vg-ink-200)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {mfaFactorId ? (
                <ShieldCheck size={24} style={{ color: 'var(--vg-success-fg)' }} />
              ) : (
                <ShieldAlert size={24} style={{ color: 'var(--vg-warning-fg)' }} />
              )}
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  {mfaFactorId ? 'Đang bật' : 'Chưa thiết lập'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--vg-ink-500)', marginTop: 2 }}>
                  {mfaFactorId 
                    ? 'Tài khoản của bạn đang được bảo vệ bởi mã TOTP.'
                    : 'Bảo vệ tài khoản bằng mã xác nhận động 6 số qua ứng dụng Authenticator.'}
                </div>
              </div>
            </div>
            
            {mfaFactorId ? (
              <button 
                type="button" 
                className={`${shared.btn}`} 
                style={{ color: 'var(--vg-danger-fg)', borderColor: 'var(--vg-danger-fg)' }}
                onClick={handleUnenrollMfa}
                disabled={pending}
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : 'Tắt 2FA'}
              </button>
            ) : (
              <button 
                type="button" 
                className={`${shared.btn} ${shared.btnPrimary}`} 
                onClick={() => router.push('/admin/setup-mfa')}
                disabled={pending}
              >
                Thiết lập ngay
              </button>
            )}
          </div>
        </div>

        {error && <p className={shared.formError} style={{ marginTop: -16 }}>{error}</p>}
        {success && <p style={{ color: 'var(--vg-success-fg)', fontSize: 13, marginTop: -16 }}>{success}</p>}
      </div>
    </section>
  );
}
