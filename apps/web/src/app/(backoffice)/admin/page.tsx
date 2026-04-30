import {
  getDashboardStats,
  getRecentOrders,
  getRevenueSparkline,
  getTopProducts,
  type DashboardRange,
} from '@/lib/admin/queries/dashboard';
import { listAuditEntries } from '@/lib/admin/queries/audit';
// ...
  const [stats, recent, sparkline, top, logs] = await Promise.all([
    getDashboardStats(range),
    getRecentOrders(5),
    getRevenueSparkline(7),
    getTopProducts(7, 5),
    listAuditEntries({ limit: 5 }),
  ]);

  return (
    <div className={shared.page}>
// ... (keep existing kpis and chart)
      <div className={styles.twoCol}>
        <section className={styles.section}>
// ... (keep recent orders)
        </section>

        <section className={styles.section}>
// ... (keep top products)
        </section>
      </div>

      <section className={styles.section} style={{ marginTop: 24 }}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Nhật ký hoạt động hệ thống</h2>
          <Link href="/admin/audit-logs" className={`${shared.btn} ${shared.btnGhost}`}>
            Xem chi tiết <ArrowRight size={14} />
          </Link>
        </div>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Lúc</th>
                <th>Nhân sự</th>
                <th>Hành động</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontSize: 11, color: 'var(--vg-ink-500)' }}>{formatDate(l.created_at)}</td>
                  <td style={{ fontWeight: 700 }}>{l.actor?.full_name || 'Hệ thống'}</td>
                  <td>
                    <span className={shared.badge}>{l.action}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{l.summary || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
