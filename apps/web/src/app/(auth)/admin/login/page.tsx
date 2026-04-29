'use client';

import { adminGoogleLogin, adminLogin, signInWithGitHub } from '@/app/actions/auth';
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import styles from './admin-auth.module.css';

const URL_ERRORS: Record<string, string> = {
  no_access: 'Tài khoản này không có quyền truy cập hệ thống quản trị.',
  oauth_failed: 'Đăng nhập OAuth thất bại. Vui lòng thử lại.',
  not_whitelisted:
    'Email này chưa được Super Admin cấp quyền nhân sự. Vui lòng liên hệ quản trị viên.',
  not_collaborator:
    'Tài khoản GitHub này không phải collaborator của repo dự án.',
};

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(adminLogin, null);
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  
  const [visibleError, setVisibleError] = useState<string | null>(null);

  // Cập nhật lỗi hiển thị khi có lỗi mới từ Server hoặc URL
  useEffect(() => {
    const error = state?.error ?? (urlError ? URL_ERRORS[urlError] : null);
    if (error && error !== visibleError) {
      setVisibleError(error);
      const timer = setTimeout(() => {
        setVisibleError(null);
      }, 5000); // 5 giây tự động ẩn
      return () => clearTimeout(timer);
    }
  }, [state, urlError, visibleError]);

  const errorMessage = visibleError;

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} />
          Về trang cửa hàng
        </Link>

        <div className={styles.card}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <ShieldCheck size={22} />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>VeganGlow</span>
              <span className={styles.brandSubtitle}>Security Gateway</span>
            </div>
          </div>

          <h1 className={styles.title}>Administrator Console</h1>
          <p className={styles.subtitle}>
            Hệ thống quản trị và kiểm soát dữ liệu tập trung cho cấp quản lý.
          </p>

          {errorMessage && (
            <div className={`${styles.error} ${urlError === 'no_access' ? styles.errorCritical : ''}`}>
              <AlertCircle size={18} />
              <div className={styles.errorText}>{errorMessage}</div>
            </div>
          )}

          <form action={formAction} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Email hoặc Tên đăng nhập
              </label>
              <input
                id="email"
                name="email"
                type="text"
                required
                className={styles.input}
                placeholder="admin@veganglow.vn hoặc username"
                autoComplete="username"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={styles.input}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={isPending} className={styles.button}>
              {isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Xác thực & Đăng nhập
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className={styles.divider}>
            <span>Hoặc tiếp tục với</span>
          </div>

          <div className={styles.socialButtons}>
            <form action={adminGoogleLogin} className={styles.socialForm}>
              <button type="submit" className={styles.socialButton}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            </form>

            <form action={signInWithGitHub} className={styles.socialForm}>
              <button type="submit" className={styles.socialButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </button>
            </form>
          </div>

          <div className={styles.secureNotice}>
            <ShieldCheck size={14} />
            Bảo mật bằng mã hóa cấp doanh nghiệp · Phiên đăng nhập tự động hết hạn
          </div>
        </div>
      </div>

    </div>
  );
}
