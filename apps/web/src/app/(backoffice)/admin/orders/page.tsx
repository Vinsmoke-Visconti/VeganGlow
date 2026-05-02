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

      <Suspense fallback={<div className={shared.loadingSkeleton} style={{ height: '400px', borderRadius: 'var(--vg-radius-xl)' }} />}>
        <OrdersClient orders={orders} filters={filters} />
      </Suspense>
    </div>
  );
}
