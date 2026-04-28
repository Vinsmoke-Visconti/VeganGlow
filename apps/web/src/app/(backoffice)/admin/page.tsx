'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  Loader2,
  Package,
  AlertTriangle,
  Users,
  DollarSign,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';
import styles from './admin-page.module.css';

type Range = 'today' | '7d' | '30d';

type Stats = {
  revenue: number;
  orders: number;
  lowStock: number;
  users: number;
};

type RecentOrder = {
  id: string;
  code: string | null;
  customer_name: string | null;
  total_amount: number;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'badgePending',
  confirmed: 'badgeShipping',
  shipping: 'badgeShipping',
  completed: 'badgeSuccess',
  cancelled: 'badgeDanger',
};

export default function AdminDashboard() {
  const supabase = createBrowserClient();
  const [stats, setStats] = useState<Stats>({ revenue: 0, orders: 0, lowStock: 0, users: 0 });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('today');

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const RANGE_LABEL: Record<Range, string> = {
    today: 'Hôm nay',
    '7d': '7 ngày',
    '30d': '30 ngày',
  };

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount, status')
        .gte('created_at', today.toISOString());

      const revenue =
        todayOrders?.reduce(
          (sum: number, o: { total_amount: number | string }) => sum + Number(o.total_amount),
          0,
        ) || 0;
      const ordersCount = todayOrders?.length || 0;

      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 5);

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      const { data: recent } = await supabase
        .from('orders')
        .select('id, code, customer_name, total_amount, status')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        revenue,
        orders: ordersCount,
        lowStock: lowStockCount || 0,
        users: userCount || 0,
      });
      setRecentOrders((recent as RecentOrder[]) || []);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingFull}>
        <Loader2 className="animate-spin" size={28} />
        Đang tải báo cáo tổng quan...
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tổng quan hệ thống</h1>
          <p className={styles.subtitle}>
            Chào mừng trở lại! Dưới đây là tình hình kinh doanh{' '}
            <strong>{RANGE_LABEL[range].toLowerCase()}</strong>.
          </p>
        </div>
        <div className={styles.rangeToggle} role="tablist" aria-label="Khoảng thời gian">
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              className={`${styles.rangeBtn} ${range === r ? styles.rangeBtnActive : ''}`}
              onClick={() => setRange(r)}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.iconGreen}`}>
            <DollarSign size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Doanh thu hôm nay</span>
            <span className={styles.statValue}>{stats.revenue.toLocaleString('vi-VN')}đ</span>
          </div>
          <span className={`${styles.statTrend} ${styles.trendUp}`}>
            <TrendingUp size={11} /> +15%
          </span>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.iconBlue}`}>
            <Package size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Đơn hàng mới</span>
            <span className={styles.statValue}>{stats.orders}</span>
          </div>
          <span className={`${styles.statTrend} ${styles.trendUp}`}>+5%</span>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.iconRed}`}>
            <AlertTriangle size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Sản phẩm sắp hết</span>
            <span className={styles.statValue}>{stats.lowStock}</span>
          </div>
          <span
            className={`${styles.statTrend} ${stats.lowStock > 0 ? styles.trendDown : styles.trendUp}`}
          >
            {stats.lowStock > 0 ? 'Cảnh báo' : 'Ổn định'}
          </span>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.iconPurple}`}>
            <Users size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Khách hàng đăng ký</span>
            <span className={styles.statValue}>{stats.users}</span>
          </div>
          <span className={`${styles.statTrend} ${styles.trendUp}`}>+2%</span>
        </div>
      </div>

      <div className={styles.gridLayout}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Doanh thu 7 ngày qua</h2>
              <span className={styles.panelHint}>So với tuần trước</span>
            </div>
            <span className={`${styles.panelChip} ${styles.panelChipUp}`}>
              <TrendingUp size={12} /> +18.4%
            </span>
          </div>
          <div className={styles.chartFrame}>
            <div className={styles.chartGrid} aria-hidden="true">
              <span className={styles.chartGridLine} />
              <span className={styles.chartGridLine} />
              <span className={styles.chartGridLine} />
              <span className={styles.chartGridLine} />
            </div>
            <div className={styles.chartContainer}>
              {[
                { day: 'T2', val: 40, amount: '2.4tr' },
                { day: 'T3', val: 65, amount: '3.9tr' },
                { day: 'T4', val: 45, amount: '2.7tr' },
                { day: 'T5', val: 90, amount: '5.4tr' },
                { day: 'T6', val: 55, amount: '3.3tr' },
                { day: 'T7', val: 75, amount: '4.5tr' },
                { day: 'CN', val: 100, amount: '6.0tr' },
              ].map((d) => (
                <div key={d.day} className={styles.chartColumn}>
                  <div
                    className={styles.chartBar}
                    style={{ height: `${d.val}%` }}
                    title={`${d.day}: ${d.amount}đ`}
                  >
                    <span className={styles.barValue}>{d.amount}</span>
                  </div>
                  <span className={styles.barLabel}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Cần xử lý ngay</h2>
              <span className={styles.panelHint}>Việc cần admin chú ý</span>
            </div>
            <Activity size={14} className={styles.panelHeaderIcon} />
          </div>
          <div className={styles.activityList}>
            <Link href="/admin/orders?status=pending" className={styles.activityItem}>
              <span className={`${styles.activityDot} ${styles.dotInfo}`} />
              <div className={styles.activityContent}>
                <p className={styles.activityText}>
                  <strong>{stats.orders}</strong> đơn hàng mới đang chờ duyệt.
                </p>
                <span className={styles.activityTime}>Click để xử lý →</span>
              </div>
            </Link>
            {stats.lowStock > 0 && (
              <Link href="/admin/products" className={styles.activityItem}>
                <span className={`${styles.activityDot} ${styles.dotDanger}`} />
                <div className={styles.activityContent}>
                  <p className={styles.activityText}>
                    <strong>{stats.lowStock} sản phẩm</strong> sắp hết hàng.
                  </p>
                  <span className={styles.activityTime}>Cần nhập thêm hàng</span>
                </div>
              </Link>
            )}
            <div className={styles.activityItem} style={{ pointerEvents: 'none' }}>
              <span className={styles.activityDot} />
              <div className={styles.activityContent}>
                <p className={styles.activityText}>
                  <strong>Hệ thống</strong> đã đồng bộ dữ liệu tồn kho mới nhất.
                </p>
                <span className={styles.activityTime}>Vừa xong</span>
              </div>
            </div>
            <div className={styles.activityItem} style={{ pointerEvents: 'none' }}>
              <span className={`${styles.activityDot} ${styles.dotInfo}`} />
              <div className={styles.activityContent}>
                <p className={styles.activityText}>
                  <strong>Bảo mật</strong> đã kiểm tra phiên đăng nhập nhân sự.
                </p>
                <span className={styles.activityTime}>15 phút trước</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Đơn hàng gần đây</h2>
          <Link href="/admin/orders" className={styles.panelLink}>
            Xem tất cả <ArrowRight size={12} />
          </Link>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: 'center',
                      padding: 'var(--space-12)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Chưa có đơn hàng nào.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className={styles.codeText}>#{order.code || order.id.slice(0, 6)}</span>
                    </td>
                    <td>{order.customer_name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>
                      {Number(order.total_amount).toLocaleString('vi-VN')}đ
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${styles[STATUS_BADGE[order.status] || 'badgePending']}`}
                      >
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
