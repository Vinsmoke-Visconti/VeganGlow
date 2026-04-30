'use client';

import { useSyncExternalStore } from 'react';
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
  Leaf,
  Sparkles,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
} from 'lucide-react';
import styles from './backoffice-layout.module.css';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
  permission?: string;
};

type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Tổng quan',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    ],
  },
  {
    title: 'Cửa hàng',
    items: [
      { href: '/admin/orders', icon: ShoppingBag, label: 'Đơn hàng', permission: 'orders:read' },
      { href: '/admin/products', icon: Package, label: 'Sản phẩm', permission: 'products:read' },
      { href: '/admin/categories', icon: FolderOpen, label: 'Danh mục', permission: 'products:read' },
      { href: '/admin/customers', icon: Users, label: 'Khách hàng', permission: 'customers:read' },
    ],
  },
  {
    title: 'Tiếp thị',
    items: [
      { href: '/admin/marketing', icon: Megaphone, label: 'Khuyến mãi & Banner', permission: 'marketing:read' },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/admin/users', icon: UserCog, label: 'Nhân sự', permission: 'users:read' },
      { href: '/admin/roles', icon: Shield, label: 'Phân quyền', permission: 'users:write' },
      { href: '/admin/audit-logs', icon: ScrollText, label: 'Nhật ký hoạt động' },
      { href: '/admin/settings', icon: Settings, label: 'Cài đặt' },
      { href: '/admin/about-team', icon: Sparkles, label: 'Tác giả & Nhóm' },
    ],
  },
];

type Props = {
  permissions?: string[];
};

const COLLAPSE_KEY = 'vg.admin.sidebar.collapsed';
const COLLAPSE_EVENT = 'vg:admin-sidebar-collapse';

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(COLLAPSE_KEY) === '1';
}

function subscribeCollapsed(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(COLLAPSE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

function setCollapsedPersistent(next: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
  document.documentElement.dataset.adminSidebar = next ? 'collapsed' : 'expanded';
  window.dispatchEvent(new Event(COLLAPSE_EVENT));
}

export function AdminSidebar({ permissions }: Props) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || !permissions || permissions.includes(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <Link href="/admin" className={styles.logo}>
          <span className={styles.logoIcon}>
            <Leaf size={18} />
          </span>
          {!collapsed && (
            <span className={styles.logoText}>
              <span className={styles.logoBrand}>VeganGlow</span>
              <span className={styles.logoAccent}>Admin Console</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          className={styles.collapseToggle}
          onClick={() => setCollapsedPersistent(!collapsed)}
          aria-label={collapsed ? 'Mở sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className={styles.sidebarNav}>
        {visibleGroups.map((group) => (
          <div key={group.title} className={styles.navGroup}>
            {!collapsed && <span className={styles.navGroupTitle}>{group.title}</span>}
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} className={styles.navIcon} />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
