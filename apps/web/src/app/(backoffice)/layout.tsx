import Link from 'next/link';
import styles from './backoffice-layout.module.css';

export default function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.adminContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/admin/dashboard" className={styles.logo}>
            VeganGlow<span className={styles.logoAccent}>Admin</span>
          </Link>
        </div>
        
        <nav className={styles.sidebarNav}>
          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Tổng quan</span>
            <Link href="/admin/dashboard" className={styles.navItem}>
              📊 Dashboard
            </Link>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Cửa hàng</span>
            <Link href="/admin/orders" className={styles.navItem}>
              📦 Đơn hàng
            </Link>
            <Link href="/admin/products" className={styles.navItem}>
              🧴 Sản phẩm
            </Link>
            <Link href="/admin/categories" className={styles.navItem}>
              📂 Danh mục
            </Link>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Hệ thống</span>
            <Link href="/admin/system/users" className={styles.navItem}>
              👥 Nhân sự
            </Link>
            <Link href="/admin/system/roles" className={styles.navItem}>
              🔐 Phân quyền
            </Link>
            <Link href="/admin/system/settings" className={styles.navItem}>
              ⚙️ Cài đặt
            </Link>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.storefrontLink}>
            ← Về trang cửa hàng
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        <header className={styles.topbar}>
          <div className={styles.searchBar}>
            <input type="text" placeholder="Tìm kiếm..." className={styles.searchInput} />
          </div>
          <div className={styles.userProfile}>
            <div className={styles.avatar}>A</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>Admin</span>
              <span className={styles.userRole}>Super Admin</span>
            </div>
          </div>
        </header>

        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
