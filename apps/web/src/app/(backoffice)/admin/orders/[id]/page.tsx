import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getOrder } from '@/lib/admin/queries/orders';
import {
  formatVND,
  formatDate,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  PAYMENT_LABEL,
} from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';
import styles from './order-detail.module.css';
import { OrderActions } from '../_components/OrderActions';

type Props = { params: Promise<{ id: string }> };

type OrderItem = {
  id: string;
  product_name: string;
  product_image: string | null;
  unit_price: number | string;
  quantity: number;
};

type OrderShape = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  total_amount: number | string;
  status: string;
  payment_method: string;
  created_at: string;
  address: string;
  city: string;
  ward: string | null;
  province: string | null;
  note: string | null;
  items?: OrderItem[];
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = (await getOrder(id)) as OrderShape | null;
  if (!order) notFound();

  const items = order.items ?? [];

  return (
    <div className={shared.page}>
      <Link href="/admin/orders" className={`${shared.btn} ${shared.btnGhost}`}>
        <ChevronLeft size={14} /> Quay lại danh sách
      </Link>

      <div className={shared.pageHeader} style={{ marginTop: 12 }}>
        <div>
          <h1 className={shared.pageTitle}>{order.code}</h1>
          <p className={shared.pageSubtitle}>{formatDate(order.created_at)}</p>
        </div>
        <span className={`${shared.badge} ${shared[ORDER_STATUS_BADGE[order.status] ?? 'badgeMuted']}`}>
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Khách hàng</h3>
          <p className={styles.cardLine}>
            <strong>{order.customer_name}</strong>
          </p>
          <p className={styles.cardLine}>SĐT: {order.phone}</p>
          <p className={styles.cardLine}>
            {order.address}
            {order.ward ? `, ${order.ward}` : ''}
            {order.province ? `, ${order.province}` : ''}
            {order.city ? `, ${order.city}` : ''}
          </p>
          <p className={styles.cardLine}>
            Thanh toán: {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
          </p>
          {order.note && <p className={styles.cardLine}>Ghi chú: {order.note}</p>}
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Hành động</h3>
          <OrderActions id={order.id} status={order.status} />
        </section>
      </div>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Sản phẩm</h3>
        {items.length === 0 ? (
          <p style={{ color: 'var(--vg-ink-500)' }}>Không có sản phẩm trong đơn này.</p>
        ) : (
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Tên</th>
                <th>SL</th>
                <th>Đơn giá</th>
                <th>Tạm tính</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.product_name}</td>
                  <td>{it.quantity}</td>
                  <td>{formatVND(it.unit_price)}</td>
                  <td>{formatVND(Number(it.unit_price) * it.quantity)}</td>
                </tr>
              ))}
              <tr className={styles.totalRow}>
                <td colSpan={3} style={{ textAlign: 'right' }}>
                  <strong>Tổng cộng</strong>
                </td>
                <td>
                  <strong>{formatVND(order.total_amount)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
