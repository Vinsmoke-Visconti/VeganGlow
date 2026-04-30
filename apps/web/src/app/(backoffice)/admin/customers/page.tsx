import { listCustomers } from '@/lib/admin/queries/customers';
import shared from '../admin-shared.module.css';
import { Suspense } from 'react';
import { CustomersClient } from './_components/CustomersClient';

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminCustomers({ searchParams }: Props) {
  const { q } = await searchParams;
  const customers = await listCustomers({ q });

  return (
    <div className={shared.page}>


      <Suspense fallback={<div className={shared.loadingSkeleton} style={{ height: '400px', borderRadius: 'var(--vg-radius-xl)' }} />}>
        <CustomersClient customers={customers} q={q} />
      </Suspense>
    </div>
  );
}
