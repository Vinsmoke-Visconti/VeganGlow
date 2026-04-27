import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import styles from './backoffice-layout.module.css';
import PageTransition from '@/components/ui/PageTransition';

export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // NOTE: Authentication and staff checks are handled by middleware.ts
  // to avoid infinite redirect loops on the login page.


  return (
    <div className={styles.adminContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/admin" className={styles.logo}>
            VeganGlow<span className={styles.logoAccent}>Admin</span>
          </Link>
        </div>
        
        <nav className={styles.sidebarNav}>
          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Tổng quan</span>
            <Link href="/admin" className={styles.navItem}>
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
            <Link href="/admin/customers" className={styles.navItem}>
              🧑‍🤝‍🧑 Khách hàng
            </Link>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Hệ thống</span>
            <Link href="/admin/users" className={styles.navItem}>
              👥 Nhân sự
            </Link>
            <Link href="/admin/roles" className={styles.navItem}>
              🔐 Phân quyền
            </Link>
            <Link href="/admin/settings" className={styles.navItem}>
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
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
