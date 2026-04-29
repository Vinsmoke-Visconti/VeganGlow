'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Package, ChevronRight, Clock, CheckCircle2, Truck, XCircle, ShoppingBag, Search } from 'lucide-react';
import styles from './orders.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import UserAccountLayout from '@/components/layout/UserAccountLayout';

export default function OrdersPage() {
  const supabase = createBrowserClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchOrders = async () => {
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
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'confirmed': return <CheckCircle2 size={16} />;
      case 'shipping': return <Truck size={16} />;
      case 'completed': return <CheckCircle2 size={16} />;
      case 'cancelled': return <XCircle size={16} />;
      default: return <Package size={16} />;
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

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8rem', gap: '1rem' }}>
        <div className={styles.loadingSpinner}></div>
        <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Đang truy xuất lịch sử đơn hàng...</span>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Đơn hàng của tôi</h1>
            <p className={styles.pageSubtitle}>Theo dõi và quản lý các đơn hàng bạn đã đặt tại VeganGlow</p>
          </div>
        </header>

        <div className={styles.tabsContainer}>
          {['all', 'pending', 'confirmed', 'shipping', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${filter === tab ? styles.tabBtnActive : ''}`}
              onClick={() => setFilter(tab)}
            >
              {tab === 'all' ? 'Tất cả' : getStatusText(tab)}
              {filter === tab && (
                <motion.div layoutId="activeTab" className={styles.tabIndicator} />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {filteredOrders.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.emptyState}
            >
              <div className={styles.emptyIcon}>
                <ShoppingBag size={48} />
              </div>
              <h3>Không tìm thấy đơn hàng nào</h3>
              <p>Có vẻ như bạn chưa có đơn hàng nào trong mục này.</p>
              <Link href="/products" className={styles.shopNowBtn}>Khám phá ngay</Link>
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={styles.orderGrid}
            >
              {filteredOrders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.orderBasicInfo}>
                      <span className={styles.orderId}>#{order.code || order.id.slice(0, 8)}</span>
                      <span className={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className={`${styles.statusTag} ${styles['status' + order.status.charAt(0).toUpperCase() + order.status.slice(1)]}`}>
                      {getStatusIcon(order.status)}
                      <span>{getStatusText(order.status)}</span>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.itemsList}>
                      {order.order_items?.slice(0, 2).map((item: any) => (
                        <div key={item.id} className={styles.orderItem}>
                          <img 
                            src={item.product_image || 'https://via.placeholder.com/60'} 
                            alt={item.product_name} 
                            style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '4px' }}
                          />
                          <div className={styles.itemMeta}>
                            <p className={styles.itemName}>{item.product_name}</p>
                            <p className={styles.itemQty}>Số lượng: {item.quantity}</p>
                          </div>
                          <span className={styles.itemPrice}>{Number(item.unit_price).toLocaleString('vi-VN')}đ</span>
                        </div>
                      ))}
                      {order.order_items?.length > 2 && (
                        <p className={styles.moreItems}>...và {order.order_items.length - 2} sản phẩm khác</p>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.orderTotal}>
                      <span>Tổng thanh toán:</span>
                      <span className={styles.totalPrice}>{Number(order.total_amount).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <Link href={`/orders/${order.id}`} className={styles.viewDetailBtn}>
                      Xem chi tiết <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}
