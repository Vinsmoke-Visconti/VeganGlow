'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Package, ChevronRight, Clock, CheckCircle2, Truck, XCircle, ShoppingBag } from 'lucide-react';
import styles from './orders.module.css';
import { motion } from 'framer-motion';

export default function OrdersPage() {
  const supabase = createBrowserClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={18} color="#f59e0b" />;
      case 'confirmed': return <CheckCircle2 size={18} color="#3b82f6" />;
      case 'shipping': return <Truck size={18} color="#8b5cf6" />;
      case 'completed': return <CheckCircle2 size={18} color="#10b981" />;
      case 'cancelled': return <XCircle size={18} color="#ef4444" />;
      default: return <Package size={18} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ xác nhận';
      case 'confirmed': return 'Đã xác nhận';
      case 'shipping': return 'Đang giao hàng';
      case 'completed': return 'Đã giao hàng';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  if (loading) {
    return <div className={styles.loading}>Đang tải lịch sử đơn hàng...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className={styles.empty}>
        <ShoppingBag size={64} color="#d1d5db" />
        <h1>Bạn chưa có đơn hàng nào</h1>
        <p>Hãy khám phá các sản phẩm tuyệt vời của VeganGlow nhé!</p>
        <Link href="/products" className={styles.shopBtn}>Mua sắm ngay</Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lịch sử đơn hàng</h1>
        <p className={styles.subtitle}>Theo dõi và quản lý các đơn hàng bạn đã đặt</p>
      </header>

      <div className={styles.orderList}>
        {orders.map((order, index) => (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={styles.orderCard}
          >
            <div className={styles.orderHeader}>
              <div className={styles.orderMeta}>
                <span className={styles.orderCode}>#{order.code}</span>
                <span className={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className={`${styles.statusBadge} ${styles['status-' + order.status]}`}>
                {getStatusIcon(order.status)}
                <span>{getStatusText(order.status)}</span>
              </div>
            </div>

            <div className={styles.orderBody}>
              <div className={styles.itemsPreview}>
                {order.order_items.map((item: any) => (
                  <div key={item.id} className={styles.itemRow}>
                    <img src={item.product_image || 'https://via.placeholder.com/50'} alt={item.product_name} />
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{item.product_name}</span>
                      <span className={styles.itemQty}>x{item.quantity}</span>
                    </div>
                    <span className={styles.itemPrice}>{Number(item.unit_price).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.orderFooter}>
              <div className={styles.totalRow}>
                <span>Tổng tiền:</span>
                <span className={styles.totalAmount}>{Number(order.total_amount).toLocaleString('vi-VN')}đ</span>
              </div>
              <Link href={`/orders/${order.id}`} className={styles.detailsBtn}>
                Xem chi tiết <ChevronRight size={16} />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
