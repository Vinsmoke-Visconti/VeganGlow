'use client';

import { Suspense, useActionState } from 'react';
import { login } from '@/app/actions/auth';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import styles from './auth.module.css';
import { createBrowserClient } from '@/lib/supabase/client';

function LoginContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const redirectTo = searchParams.get('redirectTo') || '/';

  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    formData.append('redirectTo', redirectTo);
    return login(prevState, formData);
  }, null);

  const handleGoogleLogin = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
      },
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Đăng nhập</h1>
        <p className={styles.subtitle}>Chào mừng bạn quay lại với VeganGlow</p>

        {message && <div className={styles.success}>{message}</div>}
        {state?.error && (
          <div className={styles.error}>
            <AlertCircle size={18} />
            {state.error}
          </div>
        )}

        <form action={formAction} className={styles.form}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label htmlFor="password" className={styles.label}>Mật khẩu</label>
              <Link href="/forgot-password" className={styles.link} style={{ fontSize: '0.875rem' }}>Quên mật khẩu?</Link>
            </div>
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
            {isPending ? <Loader2 size={20} className="animate-spin" /> : 'Đăng nhập'}
          </button>
        </form>

        <div className={styles.divider}>Hoặc tiếp tục với</div>

        <button type="button" onClick={handleGoogleLogin} className={styles.googleBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <p className={styles.footer}>
          Chưa có tài khoản? <Link href="/register" className={styles.link}>Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
