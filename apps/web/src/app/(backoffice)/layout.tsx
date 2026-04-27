import { createClient } from '@/lib/supabase/server';
import { Bell, Search } from 'lucide-react';
import styles from './backoffice-layout.module.css';
import PageTransition from '@/components/ui/PageTransition';
import { AdminSidebar } from './AdminSidebar';

export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // NOTE: Authentication and staff checks are handled by middleware.ts
  // to avoid infinite redirect loops on the login page.

  const rawName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const initial = displayName.charAt(0).toUpperCase();
  const isSuperAdmin = user?.user_metadata?.role === 'admin';

  return (
    <div className={styles.adminContainer}>
      <AdminSidebar />

      <div className={styles.mainWrapper}>
        <header className={styles.topbar}>
          <div className={styles.searchBar}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              placeholder="Tìm sản phẩm, đơn hàng, khách hàng..."
              className={styles.searchInput}
            />
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </div>

          <div className={styles.topbarRight}>
            <button className={styles.iconBtn} aria-label="Thông báo">
              <Bell size={18} />
              <span className={styles.iconBtnBadge} />
            </button>

            <div className={styles.userProfile}>
              <div className={styles.avatar}>{initial}</div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{displayName}</span>
                <span className={styles.userRole}>
                  {isSuperAdmin ? 'Super Admin' : 'Quản trị viên'}
                </span>
              </div>
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
