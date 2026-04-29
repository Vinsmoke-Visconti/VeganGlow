'use client';

import { useTransition, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { updateOrderStatus, type OrderStatus } from '@/app/actions/admin/orders';
import shared from '../../admin-shared.module.css';

const NEXT_STATUSES: Record<string, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['completed'],
  completed: [],
  cancelled: [],
};

const LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Xác nhận',
  shipping: 'Bắt đầu giao',
  completed: 'Hoàn thành',
  cancelled: 'Hủy đơn',
};

export function OrderActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const choices = NEXT_STATUSES[status] ?? [];

  if (choices.length === 0) {
    return <p style={{ color: 'var(--vg-ink-500)', margin: 0 }}>Đã chốt trạng thái cuối.</p>;
  }

  function go(next: OrderStatus) {
    setError(null);
    start(async () => {
      const res = await updateOrderStatus(id, next);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {choices.map((next) => (
          <button
            key={next}
            type="button"
            disabled={pending}
            className={`${shared.btn} ${next === 'cancelled' ? shared.btnDanger : shared.btnPrimary}`}
            onClick={() => go(next)}
          >
            {pending ? <Loader2 size={14} /> : null} {LABEL[next]}
          </button>
        ))}
      </div>
      {error && <p className={shared.formError} style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
