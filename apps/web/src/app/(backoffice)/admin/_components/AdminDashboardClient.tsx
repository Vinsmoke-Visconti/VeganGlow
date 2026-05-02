'use client';

import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks/admin/useAdminDashboard';
import { SafeImage } from '@/components/ui/SafeImage';
import {
  formatNumber,
  formatRelative,
  formatVND,
  ORDER_STATUS_LABEL,
} from '@/lib/admin/format';
import type { DashboardRange, DashboardSnapshot, DashboardStats } from '@/types/admin-dashboard';
import { KpiCard } from './KpiCard';
import { RangeSwitch } from './RangeSwitch';
import { RevenueChart } from './RevenueChart';
import { StatusBreakdown } from './StatusBreakdown';
import styles from '../admin-shared.module.css';

const RANGE_LABEL: Record<DashboardRange, string> = {
  today: 'hôm nay',
  '7d': '7 ngày qua',
  '30d': '30 ngày qua',
};

const RANGE_DELTA_LABEL: Record<DashboardRange, string> = {
  today: 'so với hôm qua',
  '7d': 'so với 7 ngày trước',
  '30d': 'so với 30 ngày trước',
};

const STATUS_PILL: Record<string, string> = {
  pending: styles.badgePending,
  confirmed: styles.badgeInfo,
  shipping: styles.badgeShipping,
  completed: styles.badgeSuccess,
  cancelled: styles.badgeMuted,
};

type Props = {
  range: DashboardRange;
  initialSnapshot: DashboardSnapshot;
};

function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)}%`;
}

function periodDelta(stats: DashboardStats): number | null {
  return deltaPercent(stats.revenue, stats.prevRevenue);
}

export function AdminDashboardClient({ range, initialSnapshot }: Props) {
  const {
    snapshot,
    selectedStats,
    isRefreshing,
    isRealtimeConnected,
    lastSyncedAt,
    error,
    refresh,
  } = useAdminDashboard(range, initialSnapshot);

  const todayStats = snapshot.periodStats.today;
  const weekStats = snapshot.periodStats['7d'];
  const monthStats = snapshot.periodStats['30d'];
  const sparkDays = range === '30d' ? 30 : 7;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>Bảng điều khiển</h1>
            <span className={styles.liveBadge} data-live={isRealtimeConnected ? 'true' : 'false'}>
              <span className={styles.liveDot} />
              {isRealtimeConnected ? 'Live' : 'Đang nối'}
            </span>
          </div>
          <p className={styles.pageSubtitle}>
            Tổng quan vận hành VeganGlow theo dữ liệu Supabase thật - {RANGE_LABEL[range]}
            {lastSyncedAt ? `, cập nhật ${formatRelative(lastSyncedAt)}` : ''}
          </p>
        </div>
        <div className={styles.pageActions}>
          <RangeSwitch current={range} />
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => void refresh()}
            disabled={isRefreshing}
          >
            <RefreshCw size={15} className={isRefreshing ? styles.spinIcon : undefined} />
            Làm mới
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button type="button" className={styles.errorRetry} onClick={() => void refresh()}>
            Thử lại
          </button>
        </div>
      )}

      <section className={styles.kpiGrid} aria-busy={isRefreshing}>
        <KpiCard
          label="Doanh thu hôm nay"
          value={formatVND(todayStats.revenue)}
          delta={periodDelta(todayStats)}
          deltaSuffix="so với hôm qua"
          icon={DollarSign}
        />
        <KpiCard
          label="Doanh thu 7 ngày"
          value={formatVND(weekStats.revenue)}
          delta={periodDelta(weekStats)}
          deltaSuffix="so với 7 ngày trước"
          icon={TrendingUp}
        />
        <KpiCard
          label="Doanh thu 30 ngày"
          value={formatVND(monthStats.revenue)}
          delta={periodDelta(monthStats)}
          deltaSuffix="so với 30 ngày trước"
          icon={BarChart3}
        />
        <KpiCard
          label={`Đơn hàng ${RANGE_LABEL[range]}`}
          value={formatNumber(selectedStats.orders)}
          delta={deltaPercent(selectedStats.orders, selectedStats.prevOrders)}
          deltaSuffix={RANGE_DELTA_LABEL[range]}
          icon={ShoppingCart}
        />
        <KpiCard
          label="AOV"
          value={formatVND(selectedStats.averageOrderValue)}
          hint={`Giá trị đơn trung bình ${RANGE_LABEL[range]}`}
          icon={Activity}
        />
        <KpiCard
          label="Conversion rate"
          value={formatPercent(selectedStats.conversionRate)}
          hint="Dựa trên analytics_events"
          icon={Users}
        />
        <KpiCard
          label="Cảnh báo tồn kho"
          value={formatNumber(selectedStats.lowStock)}
          icon={AlertTriangle}
          hint="Sản phẩm còn dưới 5"
        />
      </section>

      <section className={styles.dashboardGrid}>
        <div className={`${styles.tableWrap} ${styles.dashboardWide}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Revenue trend</h2>
              <p className={styles.panelSubtitle}>{sparkDays} ngày gần nhất</p>
            </div>
          </div>
          <div className={styles.panelBody}>
            <RevenueChart data={snapshot.revenue} />
          </div>
        </div>

        <div className={styles.tableWrap}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Order status funnel</h2>
              <p className={styles.panelSubtitle}>30 ngày gần nhất</p>
            </div>
          </div>
          <div className={styles.panelBody}>
            <StatusBreakdown data={snapshot.statusBreakdown} />
          </div>
        </div>
      </section>

      <section className={styles.dashboardGrid}>
        <div className={`${styles.tableWrap} ${styles.dashboardWide}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Đơn hàng gần đây</h2>
              <p className={styles.panelSubtitle}>6 đơn mới nhất</p>
            </div>
            <Link href="/admin/orders" className={`${styles.btn} ${styles.btnGhost}`}>
              Xem tất cả
              <ArrowRight size={14} />
            </Link>
          </div>

          {snapshot.recentOrders.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Package size={24} />
              </div>
              <h3 className={styles.emptyTitle}>Chưa có đơn hàng</h3>
              <Link href="/admin/products" className={`${styles.btn} ${styles.btnSecondary}`}>
                Kiểm tra sản phẩm
              </Link>
            </div>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Khách</th>
                    <th className={styles.cellRight}>Tổng</th>
                    <th>Trạng thái</th>
                    <th className={styles.cellRight}>Lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/admin/orders/${order.id}`} className={styles.tableLink}>
                          {order.code}
                        </Link>
                      </td>
                      <td>{order.customer_name}</td>
                      <td className={`${styles.cellRight} ${styles.cellStrong}`}>
                        {formatVND(order.total_amount)}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${STATUS_PILL[order.status] ?? styles.badgeMuted}`}>
                          {ORDER_STATUS_LABEL[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className={`${styles.cellRight} ${styles.cellMuted}`}>
                        {formatRelative(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.tableWrap}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Sản phẩm bán chạy</h2>
              <p className={styles.panelSubtitle}>{sparkDays} ngày gần nhất</p>
            </div>
            <Link href="/admin/products" className={`${styles.btn} ${styles.btnIcon} ${styles.btnGhost}`} aria-label="Xem sản phẩm">
              <ArrowRight size={16} />
            </Link>
          </div>

          {snapshot.topProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <TrendingUp size={24} />
              </div>
              <h3 className={styles.emptyTitle}>Chưa có dữ liệu bán hàng</h3>
            </div>
          ) : (
            <ul className={styles.rankList}>
              {snapshot.topProducts.map((product, index) => (
                <li key={product.id} className={styles.rankItem}>
                  <span className={styles.rankIndex}>{index + 1}</span>
                  <div className={styles.rankMain}>
                    <span className={styles.rankTitle}>{product.name}</span>
                    <span className={styles.rankMeta}>{formatNumber(product.quantity)} đã bán</span>
                  </div>
                  <span className={styles.rankValue}>{formatVND(product.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.tableWrap}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Low stock alerts</h2>
              <p className={styles.panelSubtitle}>Ưu tiên bổ sung tồn kho</p>
            </div>
            <Link href="/admin/products" className={`${styles.btn} ${styles.btnIcon} ${styles.btnGhost}`} aria-label="Mở sản phẩm">
              <ArrowRight size={16} />
            </Link>
          </div>

          {snapshot.lowStockProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Package size={24} />
              </div>
              <h3 className={styles.emptyTitle}>Tồn kho ổn định</h3>
            </div>
          ) : (
            <ul className={styles.lowStockList}>
              {snapshot.lowStockProducts.map((product) => (
                <li key={product.id} className={styles.lowStockItem}>
                  <div className={styles.lowStockThumb} aria-hidden="true">
                    {product.image ? (
                      <SafeImage src={product.image} alt="" fallback="" />
                    ) : (
                      <Package size={16} />
                    )}
                  </div>
                  <div className={styles.lowStockMain}>
                    <Link href={`/admin/products/${product.id}`} className={styles.rankTitle}>
                      {product.name}
                    </Link>
                    <span className={styles.rankMeta}>SKU theo sản phẩm</span>
                  </div>
                  <span className={`${styles.badge} ${styles.badgeWarn}`}>
                    {formatNumber(product.stock)} còn lại
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
