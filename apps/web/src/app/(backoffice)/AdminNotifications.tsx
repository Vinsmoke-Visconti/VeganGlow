import Link from 'next/link';
import { AlertTriangle, Bell, ShoppingBag } from 'lucide-react';
import styles from './backoffice-layout.module.css';

type Props = {
  pendingOrders: number;
  lowStockProducts: number;
};

export function AdminNotifications({ pendingOrders, lowStockProducts }: Props) {
  const total = pendingOrders + lowStockProducts;

  return (
    <details className={styles.notifications}>
      <summary className={styles.notificationsButton} aria-label="Thông báo vận hành">
        <Bell size={16} />
        {total > 0 && <span className={styles.notificationsBadge}>{total > 99 ? '99+' : total}</span>}
      </summary>
      <div className={styles.notificationsPanel}>
        <div className={styles.notificationsHeader}>
          <strong>Thông báo</strong>
          <span>{total} mục cần xử lý</span>
        </div>
        <Link href="/admin/orders?status=pending" className={styles.notificationItem}>
          <span className={styles.notificationIcon}>
            <ShoppingBag size={15} />
          </span>
          <span>
            <strong>{pendingOrders} đơn chờ xử lý</strong>
            <small>Kiểm tra xác nhận và thanh toán</small>
          </span>
        </Link>
        <Link href="/admin/products?stock=low" className={styles.notificationItem}>
          <span className={styles.notificationIcon}>
            <AlertTriangle size={15} />
          </span>
          <span>
            <strong>{lowStockProducts} sản phẩm sắp hết</strong>
            <small>Bổ sung tồn kho trước khi hết hàng</small>
          </span>
        </Link>
      </div>
    </details>
  );
}
