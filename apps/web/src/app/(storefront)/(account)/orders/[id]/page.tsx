'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Loader2,
  ArrowRight,
} from 'lucide-react';

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string;
  unit_price: number;
  quantity: number;
};

type Order = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  ward: string | null;
  province: string | null;
  note: string | null;
  total_amount: number;
  payment_method: 'cod' | 'card' | 'bank_transfer';
  payment_status?: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | null;
  paid_at?: string | null;
  status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
  created_at: string;
  order_items: OrderItem[];
};

const STATUS_STEPS: { key: Order['status']; label: string; icon: React.ReactNode }[] = [
  { key: 'pending', label: 'Chờ xác nhận', icon: <Clock size={20} /> },
  { key: 'confirmed', label: 'Đã xác nhận', icon: <CheckCircle2 size={20} /> },
  { key: 'shipping', label: 'Đang giao', icon: <Truck size={20} /> },
  { key: 'completed', label: 'Hoàn thành', icon: <CheckCircle2 size={20} /> },
];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createBrowserClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?redirectTo=/orders/${params.id}`);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', params.id)
        .single();

      if (!alive) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setOrder(data as unknown as Order);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [params.id, router, supabase]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', color: '#666' }}>
        <Loader2 className="animate-spin" /> <span style={{ marginLeft: 12 }}>Đang tải đơn hàng...</span>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '5rem 1.5rem', textAlign: 'center' }}>
        <Package size={64} color="#d1d5db" style={{ margin: '0 auto 1.5rem' }} />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a4d2e', marginBottom: '0.75rem' }}>
          Không tìm thấy đơn hàng
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <Link href="/orders" style={{ color: '#10b981', fontWeight: 600 }}>
          ← Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = isCancelled ? -1 : STATUS_STEPS.findIndex(s => s.key === order.status);
  const isBankTransfer = order.payment_method === 'bank_transfer' || order.payment_method === 'card';
  const paymentStatusText =
    order.payment_status === 'paid'
      ? 'Đã nhận tiền'
      : order.payment_status === 'pending'
        ? 'Chờ ngân hàng xác nhận'
        : order.payment_status === 'failed'
          ? 'Thanh toán thất bại'
          : 'Chưa thanh toán';
  const canResumePayment =
    isBankTransfer
    && order.status === 'pending'
    && (order.payment_status === 'pending' || order.payment_status === 'unpaid');

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Link href="/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600, marginBottom: '1.5rem' }}>
          <ArrowLeft size={18} /> Quay lại
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1a4d2e', marginBottom: 4 }}>
              Đơn hàng #{order.code}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
              Đặt lúc {new Date(order.created_at).toLocaleString('vi-VN')}
            </p>
          </div>
          {isCancelled && (
            <span style={{ padding: '8px 18px', background: '#fee2e2', color: '#991b1b', borderRadius: 9999, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <XCircle size={18} /> Đã hủy
            </span>
          )}
        </div>
      </motion.div>

      {/* Status Tracker */}
      {!isCancelled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '2rem 1.5rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: 22,
              left: 30,
              right: 30,
              height: 3,
              background: '#e5e7eb',
              zIndex: 0,
            }} />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: 22,
                left: 30,
                height: 3,
                background: 'linear-gradient(90deg, #10b981, #059669)',
                zIndex: 1,
                maxWidth: 'calc(100% - 60px)',
              }}
            />
            {STATUS_STEPS.map((step, idx) => {
              const reached = idx <= currentStepIndex;
              const active = idx === currentStepIndex;
              return (
                <div key={step.key} style={{ position: 'relative', zIndex: 2, textAlign: 'center', flex: 1 }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.1, type: 'spring', stiffness: 200 }}
                    style={{
                      width: 44,
                      height: 44,
                      margin: '0 auto 8px',
                      borderRadius: '50%',
                      background: reached ? 'linear-gradient(135deg, #10b981, #059669)' : '#f3f4f6',
                      color: reached ? 'white' : '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: active ? '0 0 0 6px rgba(16, 185, 129, 0.15)' : 'none',
                      transition: 'box-shadow 0.3s ease',
                    }}
                  >
                    {step.icon}
                  </motion.div>
                  <div style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: reached ? '#1a4d2e' : '#9ca3af',
                  }}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        {/* Items */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.5rem' }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1a4d2e', marginBottom: '1rem' }}>
            Sản phẩm đã đặt
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {order.order_items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 1fr auto',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: 12,
                }}
              >
                <Image
                  src={item.product_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.product_name)}`}
                  alt={item.product_name}
                  width={64}
                  height={64}
                  style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }}
                  unoptimized
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>{item.product_name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {Number(item.unit_price).toLocaleString('vi-VN')}đ × {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#1a4d2e' }}>
                  {(Number(item.unit_price) * item.quantity).toLocaleString('vi-VN')}đ
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '1rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Tạm tính</span>
            <span>{Number(order.total_amount).toLocaleString('vi-VN')}đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: '#6b7280' }}>Phí vận chuyển</span>
            <span style={{ color: '#10b981' }}>Miễn phí</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '1.15rem', fontWeight: 800, color: '#1a4d2e' }}>
            <span>Tổng cộng</span>
            <span>{Number(order.total_amount).toLocaleString('vi-VN')}đ</span>
          </div>
        </motion.section>

        {/* Sidebar info */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              Thông tin nhận hàng
            </h3>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{order.customer_name}</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.88rem', color: '#4b5563', marginBottom: 4 }}>
              <Phone size={14} style={{ marginTop: 3 }} /> <span>{order.phone}</span>
            </div>
            {order.email && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.88rem', color: '#4b5563', marginBottom: 4 }}>
                <Mail size={14} style={{ marginTop: 3 }} /> <span>{order.email}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.88rem', color: '#4b5563' }}>
              <MapPin size={14} style={{ marginTop: 3 }} />
              <span>{[order.address, order.ward, order.province || order.city].filter(Boolean).join(', ')}</span>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              Thanh toán
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={16} color="#10b981" />
              <span style={{ fontWeight: 600 }}>
                {order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'}
              </span>
            </div>
            {isBankTransfer && (
              <div style={{ marginTop: 10, fontSize: '0.88rem', color: order.payment_status === 'paid' ? '#047857' : '#92400e', fontWeight: 600 }}>
                {paymentStatusText}
              </div>
            )}
            {order.paid_at && (
              <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#6b7280' }}>
                Đã ghi nhận lúc {new Date(order.paid_at).toLocaleString('vi-VN')}
              </div>
            )}
            {canResumePayment && (
              <Link
                href={`/checkout/pending/${order.code}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: '100%',
                  marginTop: 14,
                  padding: '0.75rem 1rem',
                  background: 'linear-gradient(135deg, #064e3b, #059669)',
                  color: 'white',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                  boxShadow: '0 8px 18px rgba(6, 78, 59, 0.18)',
                }}
              >
                Tiếp tục thanh toán <ArrowRight size={16} />
              </Link>
            )}
          </div>

          {order.note && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#92400e', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                Ghi chú
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#78350f', lineHeight: 1.6 }}>{order.note}</p>
            </div>
          )}
        </motion.aside>
      </div>
    </div>
  );
}
