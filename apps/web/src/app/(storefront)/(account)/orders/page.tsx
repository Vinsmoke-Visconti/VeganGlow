'use client';

import { useEffect, useState, Suspense } from 'react';
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

function statusToneClasses(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-success/10 text-success';
    case 'shipping':
      return 'bg-primary-50 text-primary';
    case 'cancelled':
      return 'bg-error/10 text-error';
    case 'confirmed':
      return 'bg-bg-secondary text-text';
    default:
      return 'bg-secondary/10 text-secondary';
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

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-text-muted">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-primary" />
          <span className="text-sm">Đang truy xuất lịch sử đơn hàng...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-6"
      >
        <ArrowLeft size={14} /> Quay lại hồ sơ
      </Link>

      <header className="mb-10">
        <span className="text-xs uppercase tracking-[0.2em] text-primary">Lịch sử mua sắm</span>
        <h1 className="font-serif text-3xl lg:text-4xl font-medium tracking-tight text-text mt-1">
          Đơn hàng của tôi
        </h1>
        <p className="mt-2 text-text-secondary text-sm">
          Theo dõi và quản lý các đơn hàng bạn đã đặt tại VeganGlow.
        </p>
      </header>

      <nav
        role="tablist"
        aria-label="Lọc trạng thái đơn hàng"
        className="flex gap-2 overflow-x-auto pb-3 mb-6 border-b border-border-light"
      >
        {TABS.map((tab) => {
          const isActive = filter === tab.value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(tab.value)}
              className={`shrink-0 -mb-px px-4 py-2.5 text-sm font-medium tracking-tight border-b-2 transition ${
                isActive
                  ? 'border-text text-text'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 lg:py-24 rounded-2xl bg-bg-card border border-border-light">
          <div className="inline-grid place-items-center w-20 h-20 rounded-full bg-primary-50 text-primary mb-4">
            <ShoppingBag size={32} />
          </div>
          <h3 className="font-serif text-xl font-medium text-text mb-2">
            Không tìm thấy đơn hàng nào
          </h3>
          <p className="text-text-secondary text-sm mb-6">
            Có vẻ như bạn chưa có đơn hàng nào trong mục này.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition"
          >
            Khám phá ngay
            <ArrowRight size={16} className="ml-1.5" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredOrders.map((order) => {
            const status = order.status || 'pending';
            const items = order.order_items ?? [];
            return (
              <article
                key={order.id}
                className="rounded-2xl bg-bg-card border border-border-light overflow-hidden"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 lg:px-6 py-4 border-b border-border-light bg-bg-secondary/40">
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-semibold text-text">
                      #{order.code || order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs text-text-muted">
                      {new Date(order.created_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium ${statusToneClasses(status)}`}
                    >
                      {getStatusIcon(status, 12)} {getStatusText(status)}
                    </span>
                    {(order.payment_method === 'bank_transfer' || order.payment_method === 'card') && (
                      <span
                        className={`inline-flex items-center px-3 h-7 rounded-full text-xs font-medium ${
                          order.payment_status === 'paid'
                            ? 'bg-success/10 text-success'
                            : 'bg-secondary/10 text-secondary'
                        }`}
                      >
                        {getPaymentStatusText(order.payment_status)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="px-5 lg:px-6 py-4 flex flex-col gap-3">
                  {items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-primary-50 grid place-items-center">
                        {item.product_image ? (
                          <Image
                            src={item.product_image}
                            alt={item.product_name}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <Package size={20} className="text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text line-clamp-1">{item.product_name}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          Số lượng: {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-text tabular-nums">
                        {formatVND(Number(item.unit_price))}
                      </span>
                    </div>
                  ))}

                  {items.length > 2 && (
                    <p className="text-xs text-text-muted">
                      ... và {items.length - 2} sản phẩm khác
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 lg:px-6 py-4 border-t border-border-light">
                  <div className="text-sm text-text-secondary">
                    Tổng thanh toán:{' '}
                    <span className="font-serif text-lg font-semibold text-text ml-1">
                      {formatVND(Number(order.total_amount))}
                    </span>
                  </div>
                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full border border-border bg-white text-sm text-text font-medium hover:border-text transition"
                  >
                    Xem chi tiết <ChevronRight size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
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
