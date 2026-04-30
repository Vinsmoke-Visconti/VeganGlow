'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, Info, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestPasswordOtp, updatePasswordWithOtp } from '@/app/actions/auth';
import OtpInput from '@/components/shared/OtpInput';
import styles from './password.module.css';

export default function ChangePasswordPage() {
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isOAuthOnly, setIsOAuthOnly] = useState(false);
  
  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  // UI states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  
  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkUserType() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const identities = user.identities || [];
        const hasPasswordIdentity = identities.some(id => id.provider === 'email');
        setIsOAuthOnly(!hasPasswordIdentity);
      }
      setLoading(false);
    }
    checkUserType();
  }, [supabase]);

  // Cooldown timer
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
      
      // Auto focus OTP field (Wait for animation/render)
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
          : 'Mật khẩu đã được cập nhật thành công!' 
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
        <Loader2 className={styles.spin} size={32} />
      </div>
    );
  }

  return (
    <div className={styles.passwordWrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>{isOAuthOnly ? 'Thiết lập mật khẩu' : 'Thay đổi mật khẩu'}</h1>
        <p className={styles.subtitle}>
          {isOAuthOnly 
            ? 'Tài khoản của bạn đang đăng nhập bằng Google. Hãy thiết lập mật khẩu để có thể đăng nhập bằng Email/Username trong tương lai.' 
            : 'Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác'}
        </p>
      </header>

      <div className={styles.mainContent}>
        <form className={styles.passwordForm} onSubmit={handleSubmit}>
          {/* Luồng 2: Mật khẩu hiện tại */}
          {!isOAuthOnly && (
            <div className={styles.fieldRow}>
              <div className={styles.fieldLabel}>Mật khẩu hiện tại</div>
              <div className={styles.fieldValue}>
                <div className={styles.inputWrap}>
                  <input 
                    type={showCurrent ? "text" : "password"} 
                    className={styles.input} 
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Nhập mật khẩu cũ"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className={styles.eyeBtn}>
                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mật khẩu mới */}
          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>{isOAuthOnly ? 'Mật khẩu mới' : 'Mật khẩu mới'}</div>
            <div className={styles.fieldValue}>
              <div className={styles.inputWrap}>
                <input 
                  type={showNew ? "text" : "password"} 
                  className={styles.input} 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  placeholder="Ít nhất 6 ký tự"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className={styles.eyeBtn}>
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Xác nhận mật khẩu */}
          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Xác nhận mật khẩu</div>
            <div className={styles.fieldValue}>
              <div className={styles.inputWrap}>
                <input 
                  type="password" 
                  className={styles.input} 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>
            </div>
          </div>

          <div className={styles.divider} />

          {/* OTP Section */}
          <div className={styles.otpSection}>
            <div className={styles.otpHeader}>
              <div className={styles.fieldLabel}>Mã xác nhận (OTP)</div>
              <button 
                type="button" 
                className={styles.otpSendBtn} 
                onClick={handleSendOtp}
                disabled={sendingOtp || cooldown > 0}
              >
                {sendingOtp ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
                {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : (otpSent ? 'Gửi lại mã' : 'Gửi mã qua Email')}
              </button>
            </div>
            
            <div ref={otpRef} className={styles.otpContainer}>
              <OtpInput value={otpCode} onChange={setOtpCode} disabled={updating} />
            </div>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.saveBtn} disabled={updating || !otpSent}>
              {updating ? <Loader2 className={styles.spin} size={18} /> : (isOAuthOnly ? 'Lưu thiết lập' : 'Cập nhật mật khẩu')}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`${styles.feedback} ${feedback.kind === 'success' ? styles.success : styles.error}`}
            >
              {feedback.kind === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
