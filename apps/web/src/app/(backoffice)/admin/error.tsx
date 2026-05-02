'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './admin-shared.module.css';

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.emptyState} role="alert">
        <div className={styles.emptyIcon}>
          <AlertTriangle size={24} />
        </div>
        <h1 className={styles.emptyTitle}>Không thể tải dashboard</h1>
        <p className={styles.pageSubtitle}>{error.message}</p>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={reset}>
          <RefreshCw size={15} />
          Thử lại
        </button>
      </div>
    </div>
  );
}
