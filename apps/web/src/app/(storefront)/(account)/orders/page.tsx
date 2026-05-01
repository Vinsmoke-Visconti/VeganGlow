'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Package,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ShoppingBag,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import styles from './orders.module.css';

type OrderItem = {
  id: string;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
};

type Order = {
  id: string;
  code: string | null;
  created_at: string;
  status: string;
  total_amount: number;
  payment_method: string;
  payment_status?: string | null;
  order_items?: OrderItem[];
};

const TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
] as const;

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

function getStatusIcon(status: string, size = 14) {
  switch (status) {
    case 'pending':
      return <Clock size={size} />;
    case 'confirmed':
      return <CheckCircle2 size={size} />;
    case 'shipping':
      return <Truck size={size} />;
    case 'completed':
      return <CheckCircle2 size={size} />;
    case 'cancelled':
      return <XCircle size={size} />;
    default:
      return <Package size={size} />;
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'pending':
      return 'Chờ xác nhận';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'shipping':
      return 'Đang giao hàng';
    case 'completed':
      return 'Đã giao hàng';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status || 'Chờ xử lý';
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case 'pending':
      return styles.statusPending;
    case 'confirmed':
      return styles.statusConfirmed;
    case 'shipping':
      return styles.statusShipping;
    case 'completed':
      return styles.statusCompleted;
    case 'cancelled':
      return styles.statusCancelled;
    default:
      return '';
  }
}

function getPaymentStatusText(status?: string | null) {
  switch (status) {
    case 'paid':
      return 'Đã nhận tiền';
    case 'pending':
      return 'Chờ thanh toán';
    case 'failed':
      return 'Thanh toán lỗi';
    case 'refunded':
      return 'Đã hoàn tiền';
    default:
      return 'Chưa thanh toán';
  }
}

function OrdersContent() {
  const supabase = createBrowserClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof TABS)[number]['value']>('all');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders((data ?? []) as unknown as Order[]);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [supabase]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length };
    for (const o of orders) map[o.status] = (map[o.status] || 0) + 1;
    return map;
  }, [orders]);

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div className={styles.loadingSpinner}></div>
          <span style={{ fontSize: '0.875rem' }}>Đang truy xuất lịch sử đơn hàng...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--space-4)' }}>
      <Link href="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Quay lại hồ sơ
      </Link>

      <div className={styles.wrapper}>
        <header className={styles.pageHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-primary-50)', color: 'var(--color-primary)' }}>
              <Package size={18} />
            </span>
            <h1 className={styles.pageTitle}>Đơn hàng của tôi</h1>
          </div>
          <p className={styles.pageSubtitle} style={{ marginLeft: '48px' }}>
            Theo dõi và quản lý các đơn hàng bạn đã đặt tại VeganGlow.
          </p>
        </header>

        {/* Pill tabs */}
        <nav role="tablist" aria-label="Lọc trạng thái đơn hàng" className={styles.tabsContainer}>
          {TABS.map((tab) => {
            const isActive = filter === tab.value;
            const count = counts[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(tab.value)}
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '20px',
                      height: '20px',
                      padding: '0 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 600,
                      background: isActive ? 'var(--color-primary-50)' : 'var(--color-bg-secondary)',
                      color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)'
                    }}
                  >
                    {count}
                  </span>
                )}
                {isActive && <div className={styles.tabIndicator} />}
              </button>
            );
          })}
        </nav>

        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={32} />}
            title="Không tìm thấy đơn hàng"
            description="Có vẻ như bạn chưa có đơn hàng nào trong mục này. Khám phá những sản phẩm thuần chay để bắt đầu hành trình."
            action={
              <Link href="/products" className={styles.shopNowBtn} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                Khám phá sản phẩm
                <ArrowRight size={16} />
              </Link>
            }
          />
        ) : (
          <div className={styles.orderGrid}>
            {filteredOrders.map((order) => {
              const status = order.status || 'pending';
              const items = order.order_items ?? [];
              return (
                <article key={order.id} className={styles.orderCard}>
                  {/* Header strip */}
                  <div className={styles.cardHeader}>
                    <div className={styles.orderBasicInfo}>
                      <span className={styles.orderId}>
                        #{order.code || order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={styles.orderDate}>
                        {new Date(order.created_at).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={`${styles.statusTag} ${getStatusClass(status)}`}>
                        {getStatusIcon(status, 12)} {getStatusText(status)}
                      </span>
                      {(order.payment_method === 'bank_transfer' || order.payment_method === 'card') && (
                        <span
                          className={styles.statusTag}
                          style={{
                            background: order.payment_status === 'paid' ? '#dcfce7' : '#f3f4f6',
                            color: order.payment_status === 'paid' ? '#166534' : '#4b5563',
                            border: `1px solid ${order.payment_status === 'paid' ? '#bbf7d0' : '#e5e7eb'}`
                          }}
                        >
                          {getPaymentStatusText(order.payment_status)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className={styles.cardBody}>
                    {items.slice(0, 2).map((item) => (
                      <div key={item.id} className={styles.orderItem}>
                        {item.product_image ? (
                          <Image
                            src={item.product_image}
                            alt={item.product_name}
                            width={60}
                            height={60}
                            unoptimized
                          />
                        ) : (
                          <div className={styles.itemImagePlaceholder}>
                            <Package size={24} />
                          </div>
                        )}
                        <div className={styles.itemMeta}>
                          <div className={styles.itemName}>{item.product_name}</div>
                          <div className={styles.itemQty}>Số lượng: {item.quantity}</div>
                        </div>
                        <div className={styles.itemPrice}>
                          {formatVND(Number(item.unit_price))}
                        </div>
                      </div>
                    ))}

                    {items.length > 2 && (
                      <div className={styles.moreItems} style={{ textAlign: 'left', paddingLeft: '76px' }}>
                        ... và {items.length - 2} sản phẩm khác
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className={styles.cardFooter}>
                    <div className={styles.orderTotal}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Tổng thanh toán</span>
                      <span className={styles.totalPrice}>
                        {formatVND(Number(order.total_amount))}
                      </span>
                    </div>
                    <Link href={`/orders/${order.id}`} className={styles.viewDetailBtn} style={{ textDecoration: 'none' }}>
                      Xem chi tiết <ChevronRight size={16} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersContent />
    </Suspense>
  );
}
