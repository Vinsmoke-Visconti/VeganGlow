import styles from './admin-page.module.css';

export default function AdminDashboard() {
  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tổng quan Hệ thống</h1>
        <p className={styles.subtitle}>Chào mừng trở lại! Dưới đây là tình hình kinh doanh hôm nay.</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>💰</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Doanh thu hôm nay</span>
            <span className={styles.statValue}>12,450,000 đ</span>
          </div>
          <div className={styles.statTrend + ' ' + styles.trendUp}>+15%</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>📦</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Đơn hàng mới</span>
            <span className={styles.statValue}>42</span>
          </div>
          <div className={styles.statTrend + ' ' + styles.trendUp}>+5%</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>🧴</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Sản phẩm sắp hết</span>
            <span className={styles.statValue}>3</span>
          </div>
          <div className={styles.statTrend + ' ' + styles.trendDown}>Cảnh báo</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper}>👥</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Khách hàng mới</span>
            <span className={styles.statValue}>18</span>
          </div>
          <div className={styles.statTrend + ' ' + styles.trendUp}>+2%</div>
        </div>
      </div>

      <div className={styles.gridLayout}>
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
                <tr>
                  <td>#VG-1023</td>
                  <td>Nguyễn Văn A</td>
                  <td>450,000 đ</td>
                  <td><span className={styles.badge + ' ' + styles.badgePending}>Chờ xử lý</span></td>
                </tr>
                <tr>
                  <td>#VG-1022</td>
                  <td>Trần Thị B</td>
                  <td>1,200,000 đ</td>
                  <td><span className={styles.badge + ' ' + styles.badgeSuccess}>Hoàn thành</span></td>
                </tr>
                <tr>
                  <td>#VG-1021</td>
                  <td>Lê Văn C</td>
                  <td>850,000 đ</td>
                  <td><span className={styles.badge + ' ' + styles.badgeShipping}>Đang giao</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Hoạt động hệ thống</h2>
          <div className={styles.activityList}>
            <div className={styles.activityItem}>
              <div className={styles.activityDot}></div>
              <div className={styles.activityContent}>
                <p className={styles.activityText}><strong>Admin</strong> đã cập nhật quyền cho Role <em>Nhân sự</em></p>
                <span className={styles.activityTime}>10 phút trước</span>
              </div>
            </div>
            <div className={styles.activityItem}>
              <div className={styles.activityDot}></div>
              <div className={styles.activityContent}>
                <p className={styles.activityText}><strong>Hệ thống</strong> đã sao lưu dữ liệu thành công</p>
                <span className={styles.activityTime}>1 giờ trước</span>
              </div>
            </div>
            <div className={styles.activityItem}>
              <div className={styles.activityDot}></div>
              <div className={styles.activityContent}>
                <p className={styles.activityText}><strong>Kho</strong> thông báo <em>Serum Vitamin C</em> sắp hết hàng</p>
                <span className={styles.activityTime}>2 giờ trước</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
