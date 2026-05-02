import '@/styles/admin-tokens.css';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

import styles from './backoffice-layout.module.css';
import PageTransition from '@/components/ui/PageTransition';
import { AdminSidebar } from './AdminSidebar';
import { AdminProfileMenu } from './AdminProfileMenu';
import { AdminBreadcrumb } from './AdminBreadcrumb';
import { AdminNotifications } from './AdminNotifications';
import { IdleTimeoutGuard } from '@/components/admin/IdleTimeoutGuard';
import { ThemeToggle } from './_components/ThemeToggle';

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

  // Authentication and staff checks are handled by middleware.ts.
  let staffName: string | null = null;
  let roleLabel = 'Quản trị viên';
  let roleId: string | null = null;
  let permissions: string[] = [];
  let pendingOrders = 0;
  let lowStockProducts = 0;

  if (user) {
    const [staffResult, pendingOrdersResult, lowStockResult] = await Promise.all([
      supabase
        .from('staff_profiles')
        .select('full_name, role:roles(id, name, display_name)')
        .eq('id', user.id)
        .maybeSingle<StaffRoleRow>(),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .lt('stock', 5),
    ]);

    const staffRow = staffResult.data;
    pendingOrders = pendingOrdersResult.count ?? 0;
    lowStockProducts = lowStockResult.count ?? 0;

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

  const rawName = staffName || user?.email?.split('@')[0] || 'Admin';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const initial = displayName.charAt(0).toUpperCase();
  const email = user?.email || '';

  return (
    <div className={styles.adminContainer}>
      <IdleTimeoutGuard />
      <AdminSidebar permissions={permissions} />

      <div className={styles.mainWrapper}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <AdminBreadcrumb />
          </div>

          <div className={styles.topbarRight}>
            <ThemeToggle />
            <AdminNotifications
              pendingOrders={pendingOrders}
              lowStockProducts={lowStockProducts}
            />
            <AdminProfileMenu
              displayName={displayName}
              initial={initial}
              roleLabel={roleLabel}
            />
          </div>
        </header>

        <main className={styles.mainContent}>
          <PageTransition>{children}</PageTransition>
        </main>

        <footer className={styles.adminFooter} aria-label="Admin footer">
          <div className={styles.adminFooterBrand}>
            <span>&copy; {new Date().getFullYear()} VeganGlow</span>
            <span className={styles.adminFooterDivider} aria-hidden="true" />
            <span>Admin Console</span>
          </div>
          <div className={styles.adminFooterMeta}>
            <span>Dữ liệu vận hành từ Supabase</span>
            <span>Hiển thị theo phân quyền nhân sự</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
