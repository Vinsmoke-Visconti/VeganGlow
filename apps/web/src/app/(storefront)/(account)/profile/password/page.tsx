'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import Link from 'next/link';
import { requestPasswordOtp, updatePasswordWithOtp } from '@/app/actions/auth';
import OtpInput from '@/components/shared/OtpInput';
import styles from './password.module.css';

export default function ChangePasswordPage() {
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isOAuthOnly, setIsOAuthOnly] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkUserType() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const identities = user.identities || [];
        const hasPasswordIdentity = identities.some((id) => id.provider === 'email');
        setIsOAuthOnly(!hasPasswordIdentity);
      }
      setLoading(false);
    }
    checkUserType();
  }, [supabase]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (cooldown > 0) return;
    setSendingOtp(true);
    setFeedback(null);

    const res = await requestPasswordOtp(isOAuthOnly ? 'set_password' : 'change_password');

    setSendingOtp(false);
    if (res.error) {
      setFeedback({ kind: 'error', message: res.error });
    } else {
      setOtpSent(true);
      setCooldown(60);
      setFeedback({ kind: 'success', message: 'Mã xác nhận đã được gửi đến email của bạn.' });

      setTimeout(() => {
        const firstInput = otpRef.current?.querySelector('input');
        firstInput?.focus();
      }, 300);
    }
  };

  const passwordMatchesAndValid =
    newPassword.length >= 6 && newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword !== confirmPassword) {
      setFeedback({ kind: 'error', message: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    if (newPassword.length < 6) {
      setFeedback({ kind: 'error', message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }

    if (otpCode.length < 6) {
      setFeedback({ kind: 'error', message: 'Vui lòng nhập đầy đủ mã xác nhận 6 số.' });
      return;
    }

    setUpdating(true);

    const formData = new FormData();
    formData.append('purpose', isOAuthOnly ? 'set_password' : 'change_password');
    formData.append('currentPassword', currentPassword);
    formData.append('newPassword', newPassword);
    formData.append('otpCode', otpCode);

    const res = await updatePasswordWithOtp(formData);

    setUpdating(false);

    if (res.error) {
      setFeedback({ kind: 'error', message: res.error });
    } else {
      setFeedback({
        kind: 'success',
        message: isOAuthOnly
          ? 'Đã thiết lập mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng Email/Username.'
          : 'Mật khẩu đã được cập nhật thành công!',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setOtpSent(false);
      if (isOAuthOnly) setIsOAuthOnly(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={32} className={styles.spin} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-4)' }}>
      <Link href="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Quay lại hồ sơ
      </Link>

      <div className={styles.passwordWrapper} style={{ padding: 'var(--space-8)' }}>
        <header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-primary-50)', color: 'var(--color-primary)' }}>
              <KeyRound size={18} />
            </span>
            <h1 className={styles.title}>
              {isOAuthOnly ? 'Thiết lập mật khẩu' : 'Thay đổi mật khẩu'}
            </h1>
          </div>
          <p className={styles.subtitle} style={{ marginLeft: '48px' }}>
            {isOAuthOnly
              ? 'Tài khoản của bạn đang đăng nhập bằng Google. Hãy thiết lập mật khẩu để có thể đăng nhập bằng Email/Username trong tương lai.'
              : 'Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác.'}
          </p>
        </header>

        <form className={styles.passwordForm} onSubmit={handleSubmit} style={{ marginLeft: '48px' }}>
          {!isOAuthOnly && (
            <div className={styles.fieldRow}>
              <div className={styles.fieldLabel}>Mật khẩu hiện tại</div>
              <div className={styles.fieldValue}>
                <PasswordField
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Nhập mật khẩu cũ"
                  visible={showCurrent}
                  onToggle={() => setShowCurrent(!showCurrent)}
                  required
                />
              </div>
            </div>
          )}

          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Mật khẩu mới</div>
            <div className={styles.fieldValue}>
              <PasswordField
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Ít nhất 6 ký tự"
                visible={showNew}
                onToggle={() => setShowNew(!showNew)}
                required
                showStrength
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Xác nhận mật khẩu</div>
            <div className={styles.fieldValue}>
              <PasswordField
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Nhập lại mật khẩu mới"
                required
                matchHint={
                  confirmPassword.length === 0
                    ? null
                    : passwordMatchesAndValid
                    ? 'match'
                    : confirmPassword === newPassword
                    ? null
                    : 'mismatch'
                }
              />
            </div>
          </div>

          <div className={styles.divider} />

          {/* OTP section */}
          <div className={styles.otpSection}>
            <div className={styles.otpHeader}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Mã xác nhận (OTP)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{otpSent ? 'Mã đã được gửi đến email' : 'Mã 6 số gửi qua email'}</span>
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || cooldown > 0}
                className={styles.otpSendBtn}
              >
                {sendingOtp ? <Loader2 size={14} className={styles.spin} /> : <Send size={14} />}
                {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : otpSent ? 'Gửi lại mã' : 'Gửi mã qua Email'}
              </button>
            </div>

            <div className={styles.otpContainer} ref={otpRef}>
              <OtpInput value={otpCode} onChange={setOtpCode} disabled={updating || !otpSent} />
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="submit"
              disabled={updating || !otpSent}
              className={styles.saveBtn}
            >
              {updating ? <Loader2 size={16} className={styles.spin} style={{ marginRight: '0.5rem' }} /> : <ShieldCheck size={16} style={{ marginRight: '0.5rem' }} />}
              {isOAuthOnly ? 'Lưu thiết lập' : 'Cập nhật mật khẩu'}
            </button>
          </div>

          {feedback && (
            <div className={`${styles.feedback} ${feedback.kind === 'success' ? styles.success : styles.error}`}>
              {feedback.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.message}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

interface PasswordFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  visible?: boolean;
  onToggle?: () => void;
  required?: boolean;
  showStrength?: boolean;
  matchHint?: 'match' | 'mismatch' | null;
}

function PasswordField({
  value,
  onChange,
  placeholder,
  visible,
  onToggle,
  required,
  showStrength,
  matchHint,
}: PasswordFieldProps) {
  const strength = scoreStrength(value);

  return (
    <div style={{ width: '100%' }}>
      <div className={styles.inputWrap}>
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={styles.input}
          style={{
            borderColor: matchHint === 'mismatch' ? 'var(--color-error)' : matchHint === 'match' ? 'var(--color-success)' : undefined
          }}
        />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={styles.eyeBtn}
            title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {showStrength && value.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem' }}>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                style={{
                  height: '4px',
                  borderRadius: '2px',
                  background: i < strength.level ? strength.color : 'var(--color-border-light)',
                  transition: 'background 0.2s ease'
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 600, color: strength.color }}>
            {strength.label}
          </span>
        </div>
      )}

      {matchHint === 'mismatch' && (
        <span style={{ fontSize: '0.6875rem', color: 'var(--color-error)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
          <AlertCircle size={12} /> Mật khẩu không khớp
        </span>
      )}
      {matchHint === 'match' && (
        <span style={{ fontSize: '0.6875rem', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
          <CheckCircle2 size={12} /> Mật khẩu khớp
        </span>
      )}
    </div>
  );
}

function scoreStrength(pw: string): { level: number; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Yếu', color: 'var(--color-error)' };
  if (score === 2) return { level: 2, label: 'Khá', color: 'var(--color-warning)' };
  if (score === 3) return { level: 3, label: 'Tốt', color: 'var(--color-info)' };
  return { level: 4, label: 'Mạnh', color: 'var(--color-success)' };
}
