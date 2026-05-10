'use client';

import { useActionState } from 'react';
import { signup, sendRegisterOtp, verifyRegisterOtp } from '@/app/actions/auth';
import Link from 'next/link';
import { AlertCircle, Loader2, CheckCircle2, Mail, KeyRound, UserPlus } from 'lucide-react';
import styles from '../login/auth.module.css';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type Step = 'email' | 'otp' | 'account';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isPendingOtp, startOtpTransition] = useTransition();
  const [isPendingVerify, startVerifyTransition] = useTransition();
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Signup form action
  const [signupState, signupAction, isSignupPending] = useActionState(signup, null);
  // Send OTP form action
  const [otpState, sendOtpAction, isSendingOtp] = useActionState(sendRegisterOtp, null);

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };
    checkSession();
  }, [router]);

  // Handle OTP state changes
  useEffect(() => {
    if (otpState?.success) {
      setOtpSent(true);
      setStep('otp');
      setCountdown(60);
    }
  }, [otpState]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const validateUsername = (value: string) => {
    if (!value) { setUsernameError(''); return; }
    if (/\s/.test(value)) {
      setUsernameError('Không được có dấu cách');
    } else if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
      setUsernameError('Chỉ cho phép chữ, số, dấu chấm, gạch ngang');
    } else if (value.length < 3) {
      setUsernameError('Tối thiểu 3 ký tự');
    } else {
      setUsernameError('');
    }
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);
    setOtpError('');

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otpCode];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtpCode(newOtp);
    if (pasted.length === 6) {
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      setOtpError('Vui lòng nhập đầy đủ 6 chữ số');
      return;
    }

    startVerifyTransition(async () => {
      const result = await verifyRegisterOtp(email, code);
      if (result.error) {
        setOtpError(result.error);
      } else if (result.success && result.token) {
        setVerifyToken(result.token);
        setStep('account');
      }
    });
  };

  const stepIndicator = (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '0.5rem',
      marginBottom: '1.75rem',
    }}>
      {[
        { key: 'email', icon: <Mail size={14} />, label: 'Email' },
        { key: 'otp', icon: <KeyRound size={14} />, label: 'Xác nhận' },
        { key: 'account', icon: <UserPlus size={14} />, label: 'Tài khoản' },
      ].map((s, i) => {
        const isActive = s.key === step;
        const isDone = 
          (s.key === 'email' && (step === 'otp' || step === 'account')) ||
          (s.key === 'otp' && step === 'account');
        return (
          <div key={s.key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '99px',
            fontSize: '0.75rem',
            fontWeight: 800,
            background: isActive 
              ? 'var(--color-primary-dark)' 
              : isDone 
                ? 'rgba(5, 150, 105, 0.12)' 
                : 'rgba(0,0,0,0.04)',
            color: isActive ? 'white' : isDone ? 'var(--color-primary-dark)' : 'rgba(0,0,0,0.35)',
            transition: 'all 0.3s ease',
          }}>
            {isDone ? <CheckCircle2 size={13} /> : s.icon}
            {s.label}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Đăng ký</h1>
        <p className={styles.subtitle}>Tạo tài khoản VeganGlow của bạn</p>

        {stepIndicator}

        {/* ========== STEP 1: EMAIL ========== */}
        {step === 'email' && (
          <>
            {otpState?.error && (
              <div className={styles.error}>
                <AlertCircle size={18} />
                {otpState.error}
              </div>
            )}

            <form action={sendOtpAction} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={styles.input}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <button type="submit" disabled={isSendingOtp || !email} className={styles.button}>
                {isSendingOtp ? <Loader2 size={20} className="animate-spin" /> : 'Gửi mã xác nhận'}
              </button>
            </form>
          </>
        )}

        {/* ========== STEP 2: OTP VERIFICATION ========== */}
        {step === 'otp' && (
          <>
            <div style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'rgba(5, 150, 105, 0.06)',
              borderRadius: '16px',
              border: '1px solid rgba(5, 150, 105, 0.12)',
            }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                Mã xác nhận đã được gửi đến
              </p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                {email}
              </p>
            </div>

            {otpError && (
              <div className={styles.error}>
                <AlertCircle size={18} />
                {otpError}
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
            }}>
              {otpCode.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  autoFocus={i === 0}
                  style={{
                    width: '3rem',
                    height: '3.5rem',
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    borderRadius: '12px',
                    border: otpError 
                      ? '2px solid #ef4444' 
                      : digit 
                        ? '2px solid var(--color-primary)' 
                        : '1px solid rgba(255,255,255,0.5)',
                    background: digit ? 'rgba(5, 150, 105, 0.05)' : 'rgba(255,255,255,0.5)',
                    color: 'var(--color-primary-dark)',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={isPendingVerify || otpCode.join('').length !== 6}
              className={styles.button}
            >
              {isPendingVerify ? <Loader2 size={20} className="animate-spin" /> : 'Xác nhận mã'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtpCode(['', '', '', '', '', '']); setOtpError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary-dark)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  opacity: 0.6,
                }}
              >
                ← Đổi email
              </button>

              <form action={sendOtpAction}>
                <input type="hidden" name="email" value={email} />
                <button
                  type="submit"
                  disabled={countdown > 0 || isSendingOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: countdown > 0 ? 'rgba(0,0,0,0.3)' : 'var(--color-primary-dark)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSendingOtp 
                    ? 'Đang gửi...' 
                    : countdown > 0 
                      ? `Gửi lại (${countdown}s)` 
                      : 'Gửi lại mã'}
                </button>
              </form>
            </div>
          </>
        )}

        {/* ========== STEP 3: USERNAME + PASSWORD ========== */}
        {step === 'account' && (
          <>
            <div style={{
              textAlign: 'center',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(5, 150, 105, 0.08)',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-primary-dark)',
            }}>
              <CheckCircle2 size={16} color="#059669" />
              Email đã xác nhận: {email}
            </div>

            {signupState?.error && (
              <div className={styles.error}>
                <AlertCircle size={18} />
                {signupState.error}
              </div>
            )}

            <form action={signupAction} className={styles.form}>
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="verifyToken" value={verifyToken} />

              <div className={styles.inputGroup}>
                <label htmlFor="username" className={styles.label}>Tên đăng nhập</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  className={styles.input}
                  placeholder="terrykote"
                  pattern="^[a-zA-Z0-9._\-]{3,30}$"
                  title="Chỉ cho phép chữ, số, dấu chấm, gạch ngang (3-30 ký tự)"
                  onChange={(e) => validateUsername(e.target.value)}
                  autoFocus
                />
                {usernameError && (
                  <span style={{ color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600, paddingLeft: '0.25rem' }}>
                    {usernameError}
                  </span>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>Mật khẩu</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className={styles.input}
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" disabled={isSignupPending || !!usernameError} className={styles.button}>
                {isSignupPending ? <Loader2 size={20} className="animate-spin" /> : 'Tạo tài khoản'}
              </button>
            </form>
          </>
        )}

        <p className={styles.footer}>
          Đã có tài khoản? <Link href="/login" className={styles.link}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
