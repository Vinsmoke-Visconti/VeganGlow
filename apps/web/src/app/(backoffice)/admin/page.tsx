import {
  formatDate,
  formatVND,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
} from '@/lib/admin/format';
import {
  getDashboardStats,
  getDashboardStatsWithCompare,
  getRecentOrders,
  getRevenueSparkline,
  getTopProducts,
  getConversionRate,
  getRevenueByCategory,
  type DashboardRange,
} from '@/lib/admin/queries/dashboard';
import { AlertTriangle, ArrowRight, DollarSign, Package, TrendingUp, Users, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { SafeImage } from '@/components/ui/SafeImage';
import { RangeSwitch } from './_components/RangeSwitch';
import { Sparkline } from './_components/Sparkline';
import { PieChart } from './_components/PieChart';
import { RealtimeFeed } from './_components/RealtimeFeed';
import styles from './admin-page.module.css';
import shared from './admin-shared.module.css';

const RANGE_LABEL: Record<DashboardRange, string> = {
  today: 'hôm nay',
  '7d': '7 ngày qua',
  '30d': '30 ngày qua',
};

type Props = { searchParams: Promise<{ range?: DashboardRange }> };

export default async function AdminDashboard({ searchParams }: Props) {
  const sp = await searchParams;
  const range: DashboardRange = sp.range === '7d' || sp.range === '30d' ? sp.range : 'today';

  const [stats, recent, sparkline, top, compare, conversion, byCategory] = await Promise.all([
    getDashboardStats(range),
    getRecentOrders(10),
    getRevenueSparkline(7),
    getTopProducts(7, 5),
    getDashboardStatsWithCompare(range),
    getConversionRate(range),
    getRevenueByCategory(range),
  ]);

  const fmtPct = (n: number) => (n >= 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Tổng quan</h1>
          <p className={shared.pageSubtitle}>Theo dõi hoạt động kinh doanh và hiệu suất cửa hàng</p>
        </div>
        <div className={shared.pageActions}>
          <RangeSwitch current={range} />
        </div>
      </div>

      <div className={shared.kpiGrid}>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}>
            <DollarSign size={14} />
            Doanh thu
          </div>
          <div className={shared.kpiValue}>{formatVND(stats.revenue)}</div>
          <div style={{ fontSize: 12, marginTop: 4, color: compare.delta.revenuePct >= 0 ? '#1a7f37' : '#c0392b' }}>
            {compare.delta.revenuePct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{' '}
            {fmtPct(compare.delta.revenuePct)} so với kỳ trước
          </div>
        </div>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}>
            <Package size={14} />
            Đơn hàng
          </div>
          <div className={shared.kpiValue}>{stats.orders}</div>
          <div style={{ fontSize: 12, marginTop: 4, color: compare.delta.ordersPct >= 0 ? '#1a7f37' : '#c0392b' }}>
            {compare.delta.ordersPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{' '}
            {fmtPct(compare.delta.ordersPct)} so với kỳ trước
          </div>
        </div>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}>
            <Users size={14} />
            Tỉ lệ chuyển đổi
          </div>
          <div className={shared.kpiValue}>{conversion.conversionPct.toFixed(1)}%</div>
          <div style={{ fontSize: 12, marginTop: 4, color: '#666' }}>
            {conversion.paidOrders}/{conversion.totalOrders} đơn đã thanh toán
          </div>
        </div>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}>
            <AlertTriangle size={14} />
            Sản phẩm sắp hết
          </div>
          <div className={shared.kpiValue}>{stats.lowStock}</div>
          <div style={{ fontSize: 12, marginTop: 4, color: '#666' }}>
            Tổng KH: {stats.customers}
          </div>
        </div>
      </div>

      <div className={styles.twoCol}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Doanh thu theo danh mục</h2>
          </div>
          <PieChart data={byCategory} size={180} />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Đơn hàng realtime</h2>
          </div>
          <RealtimeFeed initial={recent} />
        </section>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Doanh thu 7 ngày qua</h2>
        </div>
        <Sparkline data={sparkline} />
      </section>

      <div className={styles.twoCol}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Đơn hàng gần đây</h2>
            <Link href="/admin/orders" className={`${shared.btn} ${shared.btnGhost}`}>
              Tất cả <ArrowRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className={shared.emptyState}>
              <div className={shared.emptyIcon}>
                <Package size={24} />
              </div>
              <p className={shared.emptyTitle}>Chưa có đơn hàng</p>
            </div>
          ) : (
            <div className={shared.tableWrap}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Khách</th>
                    <th>Tổng</th>
                    <th>Trạng thái</th>
                    <th>Lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/orders/${o.id}`}>
                          <strong>{o.code}</strong>
                        </Link>
                      </td>
                      <td>{o.customer_name}</td>
                      <td>{formatVND(o.total_amount)}</td>
                      <td>
                        <span className={`${shared.badge} ${shared[ORDER_STATUS_BADGE[o.status] ?? 'badgeMuted']}`}>
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>
                      <td>{formatDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Top sản phẩm bán chạy</h2>
            <Link href="/admin/products" className={`${shared.btn} ${shared.btnGhost}`}>
              Tất cả <ArrowRight size={14} />
            </Link>
          </div>
          {top.length === 0 ? (
            <div className={shared.emptyState}>
              <div className={shared.emptyIcon}>
                <TrendingUp size={24} />
              </div>
              <p className={shared.emptyTitle}>Chưa có dữ liệu bán hàng</p>
            </div>
          ) : (
            <ol className={styles.topList}>
              {top.map((p, i) => (
                <li key={p.id} className={styles.topItem}>
                  <span className={styles.topRank}>#{i + 1}</span>
                  <div className={styles.topImageWrap}>
                    {p.image ? (
                      <SafeImage src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} fallback="" />
                    ) : (
                      <Package size={20} className={shared.iconMuted} />
                    )}
                  </div>
                  <div className={styles.topInfo}>
                    <span className={styles.topName} title={p.name}>{p.name}</span>
                    <span className={styles.topCategory}>{p.category || 'Chưa phân loại'}</span>
                  </div>
                  <div className={styles.topStats}>
                    <span className={styles.topRevenue}>{formatVND(p.revenue)}</span>
                    <span className={styles.topQty}>{p.quantity} lượt bán</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
