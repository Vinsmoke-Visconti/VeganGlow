import styles from './admin-shared.module.css';

const KPI_SKELETONS = [0, 1, 2, 3, 4, 5, 6];

export default function AdminDashboardLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <div className={styles.pageHeader}>
        <div>
          <div className={`${styles.loadingSkeleton} h-7 w-56`} />
          <div className={`${styles.loadingSkeleton} mt-3 h-4 w-80 max-w-full`} />
        </div>
        <div className={styles.pageActions}>
          <div className={`${styles.loadingSkeleton} h-9 w-56`} />
          <div className={`${styles.loadingSkeleton} h-9 w-28`} />
        </div>
      </div>

      <section className={styles.kpiGrid}>
        {KPI_SKELETONS.map((item) => (
          <div key={item} className={styles.kpiCard}>
            <div className={`${styles.loadingSkeleton} h-4 w-28`} />
            <div className={`${styles.loadingSkeleton} h-8 w-36`} />
            <div className={`${styles.loadingSkeleton} h-3 w-32`} />
          </div>
        ))}
      </section>

      <section className={styles.dashboardGrid}>
        <div className={`${styles.tableWrap} ${styles.dashboardWide}`}>
          <div className={styles.panelHeader}>
            <div className={`${styles.loadingSkeleton} h-5 w-40`} />
            <div className={`${styles.loadingSkeleton} h-4 w-24`} />
          </div>
          <div className={styles.panelBody}>
            <div className={`${styles.loadingSkeleton} h-64 w-full`} />
          </div>
        </div>
        <div className={styles.tableWrap}>
          <div className={styles.panelHeader}>
            <div className={`${styles.loadingSkeleton} h-5 w-40`} />
          </div>
          <div className={styles.panelBody}>
            <div className={`${styles.loadingSkeleton} h-48 w-full`} />
          </div>
        </div>
      </section>
    </div>
  );
}
