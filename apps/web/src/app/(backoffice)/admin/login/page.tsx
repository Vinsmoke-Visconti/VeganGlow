'use client';

import { useActionState } from 'react';
import { adminLogin } from '@/app/actions/auth';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import styles from './admin-auth.module.css';

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(adminLogin, null);

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.card}>
          <div className={styles.logo}>VeganGlow.Admin</div>
          <h1 className={styles.title}>Đăng nhập quản trị</h1>
          <p className={styles.subtitle}>Truy cập hệ thống quản lý tập trung</p>

          {state?.error && (
            <div className={styles.error}>
              <AlertCircle size={18} />
              {state.error}
            </div>
          )}

          <form action={formAction} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>Email nhân sự</label>
              <input 
                id="email" 
                name="email" 
                type="email" 
                required 
                className={styles.input} 
                placeholder="admin@veganglow.vn"
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>Mật khẩu</label>
              <input 
                id="password" 
                name="password" 
                type="password" 
                required 
                className={styles.input} 
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={isPending} className={styles.button}>
              {isPending ? <Loader2 size={20} className="animate-spin" /> : 'Đăng nhập vào hệ thống'}
            </button>
          </form>

          <div className={styles.secureNotice}>
            <ShieldCheck size={16} />
            Hệ thống được bảo mật bằng mã hóa cấp doanh nghiệp
          </div>
        </div>
      </div>
      <div className={styles.rightPanel}></div>
    </div>
  );
}
