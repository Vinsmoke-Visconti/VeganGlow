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
} from 'lucide-react';
import Link from 'next/link';
import { requestPasswordOtp, updatePasswordWithOtp } from '@/app/actions/auth';
import OtpInput from '@/components/shared/OtpInput';

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
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-6"
      >
        <ArrowLeft size={14} /> Quay lại hồ sơ
      </Link>

      <header className="mb-10">
        <span className="text-xs uppercase tracking-[0.2em] text-primary">Bảo mật tài khoản</span>
        <h1 className="font-serif text-3xl lg:text-4xl font-medium tracking-tight text-text mt-1">
          {isOAuthOnly ? 'Thiết lập mật khẩu' : 'Thay đổi mật khẩu'}
        </h1>
        <p className="mt-3 text-text-secondary text-sm leading-relaxed">
          {isOAuthOnly
            ? 'Tài khoản của bạn đang đăng nhập bằng Google. Hãy thiết lập mật khẩu để có thể đăng nhập bằng Email/Username trong tương lai.'
            : 'Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác.'}
        </p>
      </header>

      <form
        className="rounded-2xl bg-bg-card border border-border-light p-6 lg:p-8 flex flex-col gap-5"
        onSubmit={handleSubmit}
      >
        {!isOAuthOnly && (
          <PasswordField
            label="Mật khẩu hiện tại"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Nhập mật khẩu cũ"
            visible={showCurrent}
            onToggle={() => setShowCurrent(!showCurrent)}
            required
          />
        )}

        <PasswordField
          label="Mật khẩu mới"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="Ít nhất 6 ký tự"
          visible={showNew}
          onToggle={() => setShowNew(!showNew)}
          required
        />

        <PasswordField
          label="Xác nhận mật khẩu"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Nhập lại mật khẩu mới"
          required
        />

        <div className="border-t border-border-light pt-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted block">
                Mã xác nhận (OTP)
              </span>
              <span className="text-xs text-text-muted">Mã 6 số gửi qua email</span>
            </div>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp || cooldown > 0}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border bg-white text-sm text-text hover:border-text transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingOtp ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : otpSent ? 'Gửi lại mã' : 'Gửi mã qua Email'}
            </button>
          </div>

          <div ref={otpRef}>
            <OtpInput value={otpCode} onChange={setOtpCode} disabled={updating} />
          </div>
        </div>

        <button
          type="submit"
          disabled={updating || !otpSent}
          className="h-12 rounded-full bg-text text-white font-medium tracking-tight inline-flex items-center justify-center gap-2 hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <ShieldCheck size={16} />
              {isOAuthOnly ? 'Lưu thiết lập' : 'Cập nhật mật khẩu'}
            </>
          )}
        </button>

        {feedback && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
              feedback.kind === 'success'
                ? 'bg-success/10 text-success'
                : 'bg-error/10 text-error'
            }`}
          >
            {feedback.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}
      </form>
    </div>
  );
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  visible?: boolean;
  onToggle?: () => void;
  required?: boolean;
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  visible,
  onToggle,
  required,
}: PasswordFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full h-11 pl-4 pr-11 rounded-lg border border-border bg-white text-sm text-text focus:border-text focus:outline-none"
        />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-text-muted hover:text-text hover:bg-primary-50 transition"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </label>
  );
}
