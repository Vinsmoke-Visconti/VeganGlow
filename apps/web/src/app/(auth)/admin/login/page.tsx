'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { adminLogin } from '@/app/actions/auth';
import { AlertCircle, Loader2, ShieldCheck, Leaf, ArrowLeft, ArrowRight } from 'lucide-react';
import styles from './admin-auth.module.css';

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(adminLogin, null);

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
              <Leaf size={22} />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>VeganGlow</span>
              <span className={styles.brandSubtitle}>Admin Console</span>
            </div>
          </div>

          <h1 className={styles.title}>Đăng nhập quản trị</h1>
          <p className={styles.subtitle}>
            Truy cập hệ thống quản lý tập trung dành cho nhân sự VeganGlow.
          </p>

          {state?.error && (
            <div className={styles.error}>
              <AlertCircle size={18} />
              {state.error}
            </div>
          )}

          <form action={formAction} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Email nhân sự
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={styles.input}
                placeholder="admin@veganglow.vn"
                autoComplete="email"
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
                  Đăng nhập vào hệ thống
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className={styles.secureNotice}>
            <ShieldCheck size={14} />
            Bảo mật bằng mã hóa cấp doanh nghiệp · Phiên đăng nhập tự động hết hạn
          </div>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.rightInner}>
          <h2 className={styles.rightTitle}>
            Vận hành thương hiệu mỹ phẩm thuần chay với một bảng điều khiển duy nhất.
          </h2>
          <p className={styles.rightSubtitle}>
            Quản lý đơn hàng, sản phẩm, kho và đội ngũ — tất cả trong một giao diện
            được thiết kế tối ưu cho doanh nghiệp Việt Nam.
          </p>
          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <span className={styles.featureDot} />
              Theo dõi đơn hàng theo thời gian thực
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureDot} />
              Quản lý kho hàng và cảnh báo hết hàng
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureDot} />
              Phân quyền nhân sự theo vai trò (RBAC)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
