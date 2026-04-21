import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut } from 'lucide-react';
import styles from './Layout.module.css';

export default function AdminSidebar() {
  const router = useRouter();

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { name: 'Sản phẩm', icon: <Package size={20} />, path: '/admin/products' },
    { name: 'Đơn hàng', icon: <ShoppingBag size={20} />, path: '/admin/orders' },
    { name: 'Cài đặt', icon: <Settings size={20} />, path: '/admin/settings' },
  ];

  return (
    <aside className={styles.adminSidebar}>
      <div className={styles.adminSidebarBrand}>
        <div className={styles.logoDot}></div>
        <span>Admin Panel</span>
      </div>
      
      <nav className={styles.adminNav}>
        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
            className={`${styles.adminNavLink} ${router.pathname === item.path ? styles.active : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      <button className={styles.adminLogout}>
        <LogOut size={20} />
        <span>Đăng xuất</span>
      </button>
    </aside>
  );
}
