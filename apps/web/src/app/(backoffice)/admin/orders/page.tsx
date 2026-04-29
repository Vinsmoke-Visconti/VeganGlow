import Link from 'next/link';
import { Package } from 'lucide-react';
import { listOrders, type OrderListFilters } from '@/lib/admin/queries/orders';
import {
  formatVND,
  formatDate,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  PAYMENT_LABEL,
} from '@/lib/admin/format';
import shared from '../admin-shared.module.css';
import { Suspense } from 'react';
import { OrdersFilters } from './_components/OrdersFilters';
import { OrderRowActions } from './_components/OrderRowActions';

type Props = { searchParams: Promise<OrderListFilters> };

export default async function AdminOrders({ searchParams }: Props) {
  const filters = await searchParams;
  const orders = await listOrders(filters);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Đơn hàng</h1>
          <p className={shared.pageSubtitle}>{orders.length} đơn hàng phù hợp</p>
        </div>
      </div>

      <Suspense fallback={<div className={shared.loadingSkeleton} style={{ height: '48px', marginBottom: '1.5rem' }} />}>
        <OrdersFilters defaults={filters} />
      </Suspense>

      {orders.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Package size={24} />
          </div>
          <p className={shared.emptyTitle}>Không có đơn hàng phù hợp</p>
        </div>
      ) : (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Khách</th>
                <th>SĐT</th>
                <th>Tổng</th>
                <th>Trạng thái</th>
                <th>TT</th>
                <th>Lúc</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/orders/${o.id}`}>
                      <strong>{o.code}</strong>
                    </Link>
                  </td>
                  <td>{o.customer_name}</td>
                  <td>{o.phone}</td>
                  <td>{formatVND(o.total_amount)}</td>
                  <td>
                    <span className={`${shared.badge} ${shared[ORDER_STATUS_BADGE[o.status] ?? 'badgeMuted']}`}>
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td>{PAYMENT_LABEL[o.payment_method] ?? o.payment_method}</td>
                  <td>{formatDate(o.created_at)}</td>
                  <td>
                    <OrderRowActions id={o.id} status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
