'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Search, Loader2, Filter, Eye, CheckCircle, Truck, XCircle, Clock } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';

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
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

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
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as any });
      }
      alert('Cập nhật trạng thái thành công!');
    } catch (err: any) {
      alert('Lỗi khi cập nhật: ' + err.message);
    }
  }

  const filteredOrders = orders.filter(o => 
    o.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.phone.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { color: string; bg: string; label: string; icon: any }> = {
      pending: { color: '#f59e0b', bg: '#fef3c7', label: 'Chờ xử lý', icon: <Clock size={14} /> },
      confirmed: { color: '#3b82f6', bg: '#dbeafe', label: 'Đã xác nhận', icon: <CheckCircle size={14} /> },
      shipping: { color: '#8b5cf6', bg: '#ede9fe', label: 'Đang giao', icon: <Truck size={14} /> },
      completed: { color: '#10b981', bg: '#d1fae5', label: 'Hoàn thành', icon: <CheckCircle size={14} /> },
      cancelled: { color: '#ef4444', bg: '#fee2e2', label: 'Đã hủy', icon: <XCircle size={14} /> },
    };
    const s = styles[status] || styles.pending;
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px', 
        padding: '4px 10px', 
        borderRadius: '20px', 
        fontSize: '12px', 
        fontWeight: '600',
        color: s.color,
        backgroundColor: s.bg
      }}>
        {s.icon} {s.label}
      </span>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#1a4d2e' }}>Quản lý đơn hàng</h1>
          <p style={{ color: '#666' }}>Theo dõi và xử lý đơn đặt hàng từ khách hàng.</p>
        </div>
      </header>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
           <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input 
                type="text" 
                placeholder="Mã đơn, tên khách, số điện thoại..." 
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #eee', outline: 'none' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Filter size={18} color="#666" />
             <select 
               style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee', outline: 'none', minWidth: '150px' }}
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

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#666' }}>
              <Loader2 className="animate-spin" />
              Đang tải danh sách đơn hàng...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>MÃ ĐƠN</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>KHÁCH HÀNG</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>TỔNG TIỀN</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>NGÀY ĐẶT</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>Không tìm thấy đơn hàng nào.</td>
                  </tr>
                ) : filteredOrders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ fontWeight: '700', color: '#1a4d2e' }}>#{order.code}</span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>{order.customer_name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#666' }}>{order.phone}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>{order.total_amount.toLocaleString('vi-VN')}đ</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{getStatusBadge(order.status)}</td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#666' }}>
                      {new Date(order.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <button 
                        onClick={() => fetchOrderDetails(order)}
                        style={{ padding: '0.5rem', border: '1px solid #eee', background: 'none', borderRadius: '6px', cursor: 'pointer', color: '#1a4d2e' }}
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setSelectedOrder(null)} 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <XCircle size={24} color="#999" />
            </button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a4d2e', marginBottom: '0.5rem' }}>Chi tiết đơn hàng #{selectedOrder.code}</h2>
                <p style={{ color: '#666' }}>Đặt lúc: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</p>
              </div>
              <div>{getStatusBadge(selectedOrder.status)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.25rem', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#666', marginBottom: '1rem', textTransform: 'uppercase' }}>Thông tin khách hàng</h3>
                <p style={{ fontWeight: '600', marginBottom: '4px' }}>{selectedOrder.customer_name}</p>
                <p style={{ fontSize: '0.875rem', color: '#444', marginBottom: '4px' }}>📞 {selectedOrder.phone}</p>
                {selectedOrder.email && (
                  <p style={{ fontSize: '0.875rem', color: '#444', marginBottom: '4px' }}>✉️ {selectedOrder.email}</p>
                )}
                <p style={{ fontSize: '0.875rem', color: '#444' }}>
                  📍 {[selectedOrder.address, selectedOrder.ward, selectedOrder.province || selectedOrder.city].filter(Boolean).join(', ')}
                </p>
                {selectedOrder.note && (
                  <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem', fontStyle: 'italic' }}>📝 {selectedOrder.note}</p>
                )}
              </div>
              <div style={{ padding: '1.25rem', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#666', marginBottom: '1rem', textTransform: 'uppercase' }}>Thanh toán</h3>
                <p style={{ fontWeight: '600', marginBottom: '4px' }}>Phương thức: {selectedOrder.payment_method === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Thẻ ngân hàng'}</p>
                <p style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1a4d2e', marginTop: '1rem' }}>Tổng: {selectedOrder.total_amount.toLocaleString('vi-VN')}đ</p>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Sản phẩm đã đặt</h3>
              <div style={{ border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
                {loadingDetails ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Đang tải sản phẩm...</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9f9f9' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem' }}>SẢN PHẨM</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem' }}>ĐƠN GIÁ</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem' }}>SL</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem' }}>THÀNH TIỀN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item) => (
                        <tr key={item.id} style={{ borderTop: '1px solid #eee' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <SafeImage src={item.product_image} fallback="https://via.placeholder.com/40" alt={item.product_name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                              <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{item.product_name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem' }}>{item.unit_price.toLocaleString('vi-VN')}đ</td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{item.quantity}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>{(item.unit_price * item.quantity).toLocaleString('vi-VN')}đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Cập nhật trạng thái</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button 
                  disabled={selectedOrder.status === 'confirmed'}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                  style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle size={18} /> Xác nhận đơn
                </button>
                <button 
                  disabled={selectedOrder.status === 'shipping'}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'shipping')}
                  style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#8b5cf6', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Truck size={18} /> Giao hàng
                </button>
                <button 
                  disabled={selectedOrder.status === 'completed'}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                  style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle size={18} /> Hoàn thành
                </button>
                <button 
                  disabled={selectedOrder.status === 'cancelled'}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                  style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <XCircle size={18} /> Hủy đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
