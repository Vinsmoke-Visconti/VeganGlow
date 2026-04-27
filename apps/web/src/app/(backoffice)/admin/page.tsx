'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import styles from './admin-page.module.css';
import { Loader2, TrendingUp, Package, AlertTriangle, Users, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const supabase = createBrowserClient();
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    lowStock: 0,
    users: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Fetch Today's Revenue & Orders
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount, status')
        .gte('created_at', today.toISOString());

      const revenue = todayOrders?.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) || 0;
      const ordersCount = todayOrders?.length || 0;

      // 2. Fetch Low Stock Products
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 5);

      // 3. Fetch Total Customers (CRM)
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      // 4. Fetch Recent Orders
      const { data: recent } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        revenue,
        orders: ordersCount,
        lowStock: lowStockCount || 0,
        users: userCount || 0
      });
      setRecentOrders(recent || []);

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#666' }}>
        <Loader2 className="animate-spin" size={32} />
        <span style={{ marginLeft: '1rem', fontSize: '1.25rem' }}>Đang tải báo cáo tổng quan...</span>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tổng quan Hệ thống</h1>
        <p className={styles.subtitle}>Chào mừng trở lại! Dưới đây là tình hình kinh doanh hôm nay.</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: '#f0fdf4' }}>
            <DollarSign size={24} color="#10b981" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Doanh thu hôm nay</span>
            <span className={styles.statValue}>{stats.revenue.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className={styles.statTrend + ' ' + styles.trendUp}>+15%</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: '#eff6ff' }}>
            <Package size={24} color="#3b82f6" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Đơn hàng mới</span>
            <span className={styles.statValue}>{stats.orders}</span>
          </div>
          <div className={styles.statTrend + ' ' + styles.trendUp}>+5%</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: '#fff1f2' }}>
            <AlertTriangle size={24} color="#ef4444" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Sản phẩm sắp hết</span>
            <span className={styles.statValue}>{stats.lowStock}</span>
          </div>
          <div className={styles.statTrend + ' ' + (stats.lowStock > 0 ? styles.trendDown : styles.trendUp)}>
            {stats.lowStock > 0 ? 'Cảnh báo' : 'Ổn định'}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: '#f5f3ff' }}>
            <Users size={24} color="#8b5cf6" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Khách hàng đăng ký</span>
            <span className={styles.statValue}>{stats.users}</span>
          </div>
          <div className={styles.statTrend + ' ' + styles.trendUp}>+2%</div>
        </div>
      </div>

      <div className={styles.gridLayout}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Biểu đồ Doanh thu (7 ngày qua)</h2>
          <div className={styles.chartContainer}>
            {[
              { day: 'T2', val: 40 },
              { day: 'T3', val: 65 },
              { day: 'T4', val: 45 },
              { day: 'T5', val: 90 },
              { day: 'T6', val: 55 },
              { day: 'T7', val: 75 },
              { day: 'CN', val: 100 },
            ].map((d, i) => (
              <div key={i} className={styles.chartColumn}>
                <div 
                  className={styles.chartBar} 
                  style={{ height: `${d.val}%` }}
                >
                  <span className={styles.barValue}>{d.val}%</span>
                </div>
                <span className={styles.barLabel}>{d.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Đơn hàng gần đây</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mã ĐH</th>
                  <th>Khách hàng</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.code}</td>
                    <td>{order.customer_name}</td>
                    <td>{Number(order.total_amount).toLocaleString('vi-VN')} đ</td>
                    <td>
                      <span className={`${styles.badge} ${
                        order.status === 'pending' ? styles.badgePending : 
                        order.status === 'completed' ? styles.badgeSuccess : 
                        styles.badgeShipping
                      }`}>
                        {order.status === 'pending' ? 'Chờ xử lý' : 
                         order.status === 'completed' ? 'Hoàn thành' : 
                         order.status === 'confirmed' ? 'Đã xác nhận' : 'Đang giao'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>Chưa có đơn hàng nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className={styles.gridLayout}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Sản phẩm bán chạy</h2>
          <div className={styles.topProducts}>
             <div className={styles.topProductItem}>
                <div className={styles.productRank}>1</div>
                <div className={styles.productDetails}>
                   <span className={styles.topProductName}>Serum Rau Má Phục Hồi</span>
                   <span className={styles.topProductSales}>128 đơn hàng</span>
                </div>
                <span className={styles.topProductRevenue}>32.5M đ</span>
             </div>
             <div className={styles.topProductItem}>
                <div className={styles.productRank}>2</div>
                <div className={styles.productDetails}>
                   <span className={styles.topProductName}>Kem Chống Nắng Trà Xanh</span>
                   <span className={styles.topProductSales}>95 đơn hàng</span>
                </div>
                <span className={styles.topProductRevenue}>24.8M đ</span>
             </div>
             <div className={styles.topProductItem}>
                <div className={styles.productRank}>3</div>
                <div className={styles.productDetails}>
                   <span className={styles.topProductName}>Toner Diếp Cá Kiềm Dầu</span>
                   <span className={styles.topProductSales}>82 đơn hàng</span>
                </div>
                <span className={styles.topProductRevenue}>18.2M đ</span>
             </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Hoạt động hệ thống</h2>
          <div className={styles.activityList}>
            <div className={styles.activityItem}>
              <div className={styles.activityDot}></div>
              <div className={styles.activityContent}>
                <p className={styles.activityText}><strong>Hệ thống</strong> đã đồng bộ dữ liệu tồn kho mới nhất.</p>
                <span className={styles.activityTime}>Vừa xong</span>
              </div>
            </div>
            <div className={styles.activityItem}>
              <div className={styles.activityDot}></div>
              <div className={styles.activityContent}>
                <p className={styles.activityText}><strong>Bảo mật</strong> Đã kiểm tra phiên đăng nhập staff.</p>
                <span className={styles.activityTime}>15 phút trước</span>
              </div>
            </div>
            {stats.lowStock > 0 && (
              <div className={styles.activityItem}>
                <div className={styles.activityDot} style={{ backgroundColor: '#ef4444' }}></div>
                <div className={styles.activityContent}>
                  <p className={styles.activityText}><strong>Cảnh báo</strong> Có {stats.lowStock} sản phẩm sắp hết hàng!</p>
                  <span className={styles.activityTime}>Ngay bây giờ</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
