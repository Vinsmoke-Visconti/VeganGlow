import { listOrders, type OrderListFilters } from '@/lib/admin/queries/orders';
import shared from '../admin-shared.module.css';
import { Suspense } from 'react';
import { OrdersClient } from './_components/OrdersClient';

type Props = { searchParams: Promise<OrderListFilters> };

export default async function AdminOrders({ searchParams }: Props) {
  const filters = await searchParams;
  const orders = await listOrders(filters);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Đơn hàng</h1>
          <p className={shared.pageSubtitle}>Theo dõi và quản lý các đơn đặt hàng từ hệ thống. Hiện có {orders.length} đơn hàng.</p>
        </div>
      </div>

      <Suspense fallback={<div className={shared.loadingSkeleton} style={{ height: '400px', borderRadius: 'var(--vg-radius-xl)' }} />}>
        <OrdersClient orders={orders} filters={filters} />
      </Suspense>
    </div>
  );
}
