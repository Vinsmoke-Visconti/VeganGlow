'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FolderOpen,
  Users,
  UserCog,
  Shield,
  Settings,
  ArrowLeft,
  Leaf,
  Sparkles,
} from 'lucide-react';
import styles from './backoffice-layout.module.css';

const NAV_GROUPS = [
  {
    title: 'Tổng quan',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    ],
  },
  {
    title: 'Cửa hàng',
    items: [
      { href: '/admin/orders', icon: ShoppingBag, label: 'Đơn hàng' },
      { href: '/admin/products', icon: Package, label: 'Sản phẩm' },
      { href: '/admin/categories', icon: FolderOpen, label: 'Danh mục' },
      { href: '/admin/customers', icon: Users, label: 'Khách hàng' },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/admin/users', icon: UserCog, label: 'Nhân sự' },
      { href: '/admin/roles', icon: Shield, label: 'Phân quyền' },
      { href: '/admin/settings', icon: Settings, label: 'Cài đặt' },
      { href: '/admin/about-team', icon: Sparkles, label: 'Tác giả & Nhóm' },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <Link href="/admin" className={styles.logo}>
          <span className={styles.logoIcon}>
            <Leaf size={18} />
          </span>
          <span className={styles.logoText}>
            <span className={styles.logoBrand}>VeganGlow</span>
            <span className={styles.logoAccent}>Admin Console</span>
          </span>
        </Link>
      </div>

      <nav className={styles.sidebarNav}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className={styles.navGroup}>
            <span className={styles.navGroupTitle}>{group.title}</span>
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                >
                  <item.icon size={18} className={styles.navIcon} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <Link href="/" className={styles.storefrontLink}>
          <ArrowLeft size={16} />
          Về trang cửa hàng
        </Link>
      </div>
    </aside>
  );
}
