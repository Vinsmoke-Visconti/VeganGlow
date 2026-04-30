'use client';

import { useTransition, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import {
  updateOrderStatus,
  adminConfirmBankTransferPayment,
  type OrderStatus,
} from '@/app/actions/admin/orders';
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

type Props = {
  id: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  /** Whether the current viewer is a super admin (server-resolved) */
  canManualConfirm?: boolean;
};

export function OrderActions({
  id,
  status,
  paymentMethod,
  paymentStatus,
  canManualConfirm = false,
}: Props) {
  const [pending, start] = useTransition();
  const [confirmPending, startConfirm] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmInfo, setConfirmInfo] = useState<string | null>(null);

  const isBankTransfer = paymentMethod === 'bank_transfer' || paymentMethod === 'card';
  const choices = (NEXT_STATUSES[status] ?? []).filter(
    (next) => next === 'cancelled' || !isBankTransfer || paymentStatus === 'paid',
  );
  const showManualConfirm =
    canManualConfirm &&
    isBankTransfer &&
    paymentStatus !== 'paid' &&
    status !== 'cancelled' &&
    status !== 'completed';

  function go(next: OrderStatus) {
    setError(null);
    start(async () => {
      const res = await updateOrderStatus(id, next);
      if (!res.ok) setError(res.error);
    });
  }

  function manualConfirm() {
    const note = window.prompt(
      'Ghi chú lý do xác nhận thủ công (sẽ ghi vào payment_transactions để đối soát):',
      '',
    );
    if (note === null) return;
    if (
      !window.confirm(
        'Xác nhận: đánh dấu đơn này là ĐÃ THANH TOÁN thủ công?\n' +
          'Hành động này được ghi audit và chỉ dùng khi webhook ngân hàng không hoạt động.',
      )
    ) {
      return;
    }
    setConfirmError(null);
    setConfirmInfo(null);
    startConfirm(async () => {
      const res = await adminConfirmBankTransferPayment(id, note);
      if (res.ok) setConfirmInfo('Đã đánh dấu đã thanh toán.');
      else setConfirmError(res.error);
    });
  }

  if (choices.length === 0 && !showManualConfirm) {
    if (isBankTransfer && paymentStatus !== 'paid' && status === 'pending') {
      return (
        <p style={{ color: 'var(--vg-ink-500)', margin: 0 }}>
          Đang chờ ngân hàng xác nhận tiền vào tài khoản.
        </p>
      );
    }
    return <p style={{ color: 'var(--vg-ink-500)', margin: 0 }}>Đã chốt trạng thái cuối.</p>;
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
        {showManualConfirm && (
          <button
            type="button"
            disabled={confirmPending}
            className={`${shared.btn} ${shared.btnPrimary}`}
            onClick={manualConfirm}
            title="Chỉ super admin. Dùng khi webhook ngân hàng không tự ghi nhận."
          >
            {confirmPending ? <Loader2 size={14} /> : <CheckCircle2 size={14} />}{' '}
            Đánh dấu đã thanh toán
          </button>
        )}
      </div>
      {error && <p className={shared.formError} style={{ marginTop: 8 }}>{error}</p>}
      {confirmError && (
        <p className={shared.formError} style={{ marginTop: 8 }}>{confirmError}</p>
      )}
      {confirmInfo && (
        <p style={{ marginTop: 8, color: 'var(--vg-success-700, #047857)' }}>{confirmInfo}</p>
      )}
    </div>
  );
}
