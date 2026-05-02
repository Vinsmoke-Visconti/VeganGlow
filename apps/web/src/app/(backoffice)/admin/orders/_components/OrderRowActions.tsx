'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, CheckCircle, Truck, XCircle, Loader2 } from 'lucide-react';
import { updateOrderStatus, type OrderStatus } from '@/app/actions/admin/orders';
import shared from '../../admin-shared.module.css';

type Props = {
  id: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
};

export function OrderRowActions({ id, status, paymentMethod, paymentStatus }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isBankTransfer = paymentMethod === 'bank_transfer' || paymentMethod === 'card';
  const canConfirm = !isBankTransfer || paymentStatus === 'paid';

  function setStatus(next: OrderStatus) {
    setError(null);
    start(async () => {
      const result = await updateOrderStatus(id, next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div>
      <div style={{ display: 'inline-flex', gap: 4 }}>
        <button
          type="button"
          className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
          onClick={() => router.push(`/admin/orders/${id}`)}
          aria-label="Xem chi tiết"
        >
          <Eye size={14} />
        </button>
        {status === 'pending' && canConfirm && (
          <button
            type="button"
            onClick={() => setStatus('confirmed')}
            disabled={pending}
            className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
            aria-label="Xác nhận"
            title="Xác nhận"
          >
            {pending ? <Loader2 size={14} /> : <CheckCircle size={14} />}
          </button>
        )}
        {status === 'confirmed' && (
          <button
            type="button"
            onClick={() => setStatus('shipping')}
            disabled={pending}
            className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
            aria-label="Bắt đầu giao"
            title="Bắt đầu giao"
          >
            {pending ? <Loader2 size={14} /> : <Truck size={14} />}
          </button>
        )}
        {(status === 'pending' || status === 'confirmed') && (
          <button
            type="button"
            onClick={() => setStatus('cancelled')}
            disabled={pending}
            className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
            aria-label="Hủy đơn"
            title="Hủy đơn"
          >
            {pending ? <Loader2 size={14} /> : <XCircle size={14} />}
          </button>
        )}
      </div>
      {error && <p className={shared.formError} style={{ marginTop: 6 }}>{error}</p>}
    </div>
  );
}
