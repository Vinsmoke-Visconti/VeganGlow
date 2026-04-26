'use client';

import { useActionState } from 'react';
import { signup } from '@/app/actions/auth';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';
import styles from '../login/auth.module.css';

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signup, null);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Đăng ký</h1>
        <p className={styles.subtitle}>Tạo tài khoản VeganGlow của bạn</p>

        {state?.error && (
          <div className={styles.error}>
            <AlertCircle size={18} />
            {state.error}
          </div>
        )}

        <form action={formAction} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="fullName" className={styles.label}>Họ và tên</label>
            <input 
              id="fullName" 
              name="fullName" 
              type="text" 
              required 
              className={styles.input} 
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              className={styles.input} 
              placeholder="you@example.com"
            />
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

          <button type="submit" disabled={isPending} className={styles.button}>
            {isPending ? <Loader2 size={20} className="animate-spin" /> : 'Tạo tài khoản'}
          </button>
        </form>

        <p className={styles.footer}>
          Đã có tài khoản? <Link href="/login" className={styles.link}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
