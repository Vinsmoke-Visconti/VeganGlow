import '@/styles/admin-tokens.css';
import { createClient } from '@/lib/supabase/server';
import { Bell, Search } from 'lucide-react';
import styles from './backoffice-layout.module.css';
import PageTransition from '@/components/ui/PageTransition';
import { AdminSidebar } from './AdminSidebar';
import { AdminProfileMenu } from './AdminProfileMenu';
import { AdminBreadcrumb } from './AdminBreadcrumb';

type StaffRoleRow = {
  full_name: string | null;
  role: { id: string; name: string; display_name: string } | null;
};

type RolePermissionRow = {
  permission: { module: string; action: string } | null;
};

export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // NOTE: Authentication and staff checks are handled by middleware.ts
  // to avoid infinite redirect loops on the login page.

  let staffName: string | null = null;
  let roleLabel = 'Quản trị viên';
  let roleId: string | null = null;
  let permissions: string[] = [];

  if (user) {
    const { data: staffRow } = await supabase
      .from('staff_profiles')
      .select('full_name, role:roles(id, name, display_name)')
      .eq('id', user.id)
      .maybeSingle<StaffRoleRow>();

    if (staffRow) {
      staffName = staffRow.full_name;
      if (staffRow.role) {
        roleLabel = staffRow.role.display_name;
        roleId = staffRow.role.id;
      }
    }

    if (roleId) {
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission:permissions(module, action)')
        .eq('role_id', roleId)
        .returns<RolePermissionRow[]>();

      permissions = (rolePerms ?? [])
        .map((rp) => rp.permission)
        .filter((p): p is { module: string; action: string } => Boolean(p))
        .map((p) => `${p.module}:${p.action}`);
    }
  }

  const rawName = staffName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const initial = displayName.charAt(0).toUpperCase();
  const email = user?.email || '';

  return (
    <div className={styles.adminContainer}>
      <AdminSidebar
        userName={displayName}
        userInitial={initial}
        userRoleLabel={roleLabel}
        permissions={permissions}
      />

      <div className={styles.mainWrapper}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <AdminBreadcrumb />
          </div>

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

            <AdminProfileMenu
              displayName={displayName}
              initial={initial}
              email={email}
              roleLabel={roleLabel}
            />
          </div>
        </header>

        <main className={styles.mainContent}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
