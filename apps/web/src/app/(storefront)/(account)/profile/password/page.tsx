'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import styles from './password.module.css';

export default function ChangePasswordPage() {
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
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

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    setLoading(false);

    if (error) {
      setFeedback({ kind: 'error', message: 'Lỗi: ' + error.message });
    } else {
      setFeedback({ kind: 'success', message: 'Mật khẩu đã được cập nhật thành công!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className={styles.passwordWrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Đổi mật khẩu</h1>
        <p className={styles.subtitle}>Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác</p>
      </header>

      <form className={styles.passwordForm} onSubmit={handleUpdatePassword}>
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
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className={styles.eyeBtn}>
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="button" className={styles.textLink}>Quên mật khẩu?</button>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.fieldLabel}>Mật khẩu mới</div>
          <div className={styles.fieldValue}>
            <div className={styles.inputWrap}>
              <input 
                type={showNew ? "text" : "password"} 
                className={styles.input} 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className={styles.eyeBtn}>
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

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
              />
            </div>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.fieldLabel}></div>
          <div className={styles.fieldValue}>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Xác nhận'}
            </button>
          </div>
        </div>
      </form>

      {feedback && (
        <div className={`${styles.feedback} ${feedback.kind === 'success' ? styles.success : styles.error}`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
}
