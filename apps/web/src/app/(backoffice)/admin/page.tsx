import Link from 'next/link';
import { Package, AlertTriangle, Users, DollarSign, ArrowRight, TrendingUp } from 'lucide-react';
import {
  getDashboardStats,
  getRecentOrders,
  getRevenueSparkline,
  getTopProducts,
  type DashboardRange,
} from '@/lib/admin/queries/dashboard';
import {
  formatVND,
  formatDate,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
} from '@/lib/admin/format';
import shared from './admin-shared.module.css';
import styles from './admin-page.module.css';
import { RangeSwitch } from './_components/RangeSwitch';
import { Sparkline } from './_components/Sparkline';

const RANGE_LABEL: Record<DashboardRange, string> = {
  today: 'hôm nay',
  '7d': '7 ngày qua',
  '30d': '30 ngày qua',
};

type Props = { searchParams: Promise<{ range?: DashboardRange }> };

export default async function AdminDashboard({ searchParams }: Props) {
  const sp = await searchParams;
  const range: DashboardRange = sp.range === '7d' || sp.range === '30d' ? sp.range : 'today';

  const [stats, recent, sparkline, top] = await Promise.all([
    getDashboardStats(range),
    getRecentOrders(5),
    getRevenueSparkline(7),
    getTopProducts(7, 5),
  ]);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Bảng điều khiển</h1>
          <p className={shared.pageSubtitle}>
            Tổng quan vận hành VeganGlow — {RANGE_LABEL[range]}
          </p>
        </div>
        <RangeSwitch current={range} />
      </div>

      <div className={shared.kpiGrid}>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}>
            <DollarSign size={14} />
            Doanh thu
          </div>
          <div className={shared.kpiValue}>{formatVND(stats.revenue)}</div>
        </div>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}>
            <Package size={14} />
            Đơn hàng
          </div>
          <div className={shared.kpiValue}>{stats.orders}</div>
        </div>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}>
            <Users size={14} />
            Tổng khách hàng
          </div>
          <div className={shared.kpiValue}>{stats.customers}</div>
        </div>
        <div className={shared.kpiCard}>
          <div className={shared.kpiLabel}>
            <AlertTriangle size={14} />
            Sản phẩm sắp hết
          </div>
          <div className={shared.kpiValue}>{stats.lowStock}</div>
        </div>
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
                  <span className={styles.topName}>{p.name}</span>
                  <span className={styles.topQty}>{p.quantity} bán</span>
                  <span className={styles.topRevenue}>{formatVND(p.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
