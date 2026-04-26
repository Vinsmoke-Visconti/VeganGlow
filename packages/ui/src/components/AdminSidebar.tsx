import React from 'react';
import { LayoutDashboard, Package, ShoppingBag, Users, Settings } from 'lucide-react';
import styles from './Layout.module.css';

interface AdminSidebarProps {
  LinkComponent?: React.ElementType;
}

export default function AdminSidebar({ LinkComponent = 'a' }: AdminSidebarProps) {
  const Link = LinkComponent;

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { name: 'Sản phẩm', icon: Package, href: '/admin/products' },
    { name: 'Đơn hàng', icon: ShoppingBag, href: '/admin/orders' },
    { name: 'Khách hàng', icon: Users, href: '/admin/users' },
    { name: 'Cài đặt', icon: Settings, href: '/admin/settings' },
  ];

  return (
    <aside className={styles.adminSidebar}>
      <div className={styles.adminSidebarBrand}>
        <Link href="/">
          <span>VeganGlow Admin</span>
        </Link>
      </div>
      <nav className={styles.adminNav}>
        {menuItems.map((item) => (
          <Link key={item.name} href={item.href} className={styles.adminNavLink}>
            <item.icon size={20} />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
