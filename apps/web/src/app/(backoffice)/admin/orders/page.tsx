'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Search, Loader2, Filter, Eye, CheckCircle, Truck, XCircle, Clock, X } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import styles from '../admin-shared.module.css';

type Order = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  email: string | null;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
  payment_method: 'cod' | 'card';
  created_at: string;
  address: string;
  city: string;
  ward: string | null;
  province: string | null;
  note: string | null;
};

const STATUS_CONFIG: Record<string, { badgeClass: string; label: string; icon: React.ReactNode }> = {
  pending:   { badgeClass: 'badgePending',  label: 'Chờ xử lý',   icon: <Clock size={13} /> },
  confirmed: { badgeClass: 'badgeInfo',     label: 'Đã xác nhận', icon: <CheckCircle size={13} /> },
  shipping:  { badgeClass: 'badgeShipping', label: 'Đang giao',   icon: <Truck size={13} /> },
  completed: { badgeClass: 'badgeSuccess',  label: 'Hoàn thành',  icon: <CheckCircle size={13} /> },
  cancelled: { badgeClass: 'badgeDanger',   label: 'Đã hủy',      icon: <XCircle size={13} /> },
};

export default function AdminOrders() {
  const supabase = createBrowserClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      alert('Lỗi khi tải đơn hàng: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrderDetails(order: Order) {
    setSelectedOrder(order);
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      if (error) throw error;
      setOrderItems(data || []);
    } catch (err: any) {
      alert('Lỗi khi tải chi tiết: ' + err.message);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const { error } = await (supabase.from('orders') as any)
        .update({ status: newStatus })
        .eq('id', orderId);
      if (error) throw error;

      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as any });
      }
      alert('Cập nhật trạng thái thành công!');
    } catch (err: any) {
      alert('Lỗi khi cập nhật: ' + err.message);
    }
  }

  const filteredOrders = orders.filter(
    (o) =>
      o.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.phone.includes(searchTerm),
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <span className={`${styles.badge} ${styles[cfg.badgeClass as keyof typeof styles]}`}>
        {cfg.icon}
        {cfg.label}
      </span>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Quản lý đơn hàng</h1>
          <p className={styles.pageSubtitle}>Theo dõi và xử lý đơn đặt hàng từ khách hàng.</p>
        </div>
      </header>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Mã đơn, tên khách, số điện thoại..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="shipping">Đang giao</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        <div className={styles.tableScroll}>
          {loading ? (
            <div className={styles.loadingState}>
              <Loader2 className="animate-spin" size={22} />
              Đang tải danh sách đơn hàng...
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngày đặt</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className={styles.emptyState}>Không tìm thấy đơn hàng nào.</div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className={styles.codeText}>#{order.code}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{order.customer_name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {order.phone}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{order.total_amount.toLocaleString('vi-VN')}đ</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(order.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td>
                        <button
                          className={styles.btnOutline}
                          onClick={() => fetchOrderDetails(order)}
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.modalWide}`}>
            <button className={styles.modalCloseBtn} onClick={() => setSelectedOrder(null)}>
              <X size={20} />
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
              <h2 className={styles.modalTitle} style={{ marginBottom: 0 }}>
                Chi tiết đơn hàng #{selectedOrder.code}
              </h2>
              <StatusBadge status={selectedOrder.status} />
            </div>
            <p className={styles.modalSubtitle}>
              Đặt lúc: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}
            </p>

            <div className={styles.infoGrid}>
              <div className={styles.infoPanel}>
                <h3 className={styles.infoPanelTitle}>Thông tin khách hàng</h3>
                <p className={`${styles.infoLine} ${styles.infoLineBold}`}>{selectedOrder.customer_name}</p>
                <p className={styles.infoLine}>📞 {selectedOrder.phone}</p>
                {selectedOrder.email && (
                  <p className={styles.infoLine}>✉️ {selectedOrder.email}</p>
                )}
                <p className={styles.infoLine}>
                  📍 {[selectedOrder.address, selectedOrder.ward, selectedOrder.province || selectedOrder.city]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {selectedOrder.note && (
                  <p className={styles.infoLine} style={{ fontStyle: 'italic' }}>
                    📝 {selectedOrder.note}
                  </p>
                )}
              </div>

              <div className={styles.infoPanel}>
                <h3 className={styles.infoPanelTitle}>Thanh toán</h3>
                <p className={`${styles.infoLine} ${styles.infoLineBold}`}>
                  {selectedOrder.payment_method === 'cod'
                    ? 'Thanh toán khi nhận hàng (COD)'
                    : 'Thẻ ngân hàng'}
                </p>
                <p className={styles.infoTotal}>
                  {selectedOrder.total_amount.toLocaleString('vi-VN')}đ
                </p>
              </div>
            </div>

            <h3 className={styles.sectionTitle}>Sản phẩm đã đặt</h3>
            <div className={styles.subTable}>
              {loadingDetails ? (
                <div className={styles.loadingState}>Đang tải sản phẩm...</div>
              ) : (
                <table className={styles.table} style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th style={{ textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ textAlign: 'center' }}>SL</th>
                      <th style={{ textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className={styles.productCell}>
                            <div className={styles.avatarSquare} style={{ width: 40, height: 40 }}>
                              <SafeImage
                                src={item.product_image}
                                fallback="https://via.placeholder.com/40"
                                alt={item.product_name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>{item.unit_price.toLocaleString('vi-VN')}đ</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {(item.unit_price * item.quantity).toLocaleString('vi-VN')}đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <h3 className={styles.sectionTitle}>Cập nhật trạng thái</h3>
            <div className={styles.actionBtns}>
              <button
                disabled={selectedOrder.status === 'confirmed'}
                onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                className={`${styles.btnAction} ${styles.btnActionBlue}`}
              >
                <CheckCircle size={16} /> Xác nhận đơn
              </button>
              <button
                disabled={selectedOrder.status === 'shipping'}
                onClick={() => updateOrderStatus(selectedOrder.id, 'shipping')}
                className={`${styles.btnAction} ${styles.btnActionPurple}`}
              >
                <Truck size={16} /> Giao hàng
              </button>
              <button
                disabled={selectedOrder.status === 'completed'}
                onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                className={`${styles.btnAction} ${styles.btnActionGreen}`}
              >
                <CheckCircle size={16} /> Hoàn thành
              </button>
              <button
                disabled={selectedOrder.status === 'cancelled'}
                onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                className={`${styles.btnAction} ${styles.btnActionRed}`}
              >
                <XCircle size={16} /> Hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
