'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { getOrderPaymentStatusByCode } from '@/app/actions/checkout';
import { VEGANGLOW_BANK, buildVietQrUrl, bankTransferContent } from '@/lib/payment';
import styles from '../../checkout.module.css';

interface Props {
  orderId: string;
  code: string;
  amount: number;
  paymentDueAt: string | null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PendingPaymentClient({ orderId, code, amount, paymentDueAt }: Props) {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const liveStatus = usePaymentStatus({
    orderId,
    initial: 'pending',
    enabled: true,
  });

  const dueMs = useMemo(() => (paymentDueAt ? new Date(paymentDueAt).getTime() : 0), [paymentDueAt]);
  const remaining = paymentDueAt ? Math.max(0, dueMs - now) : null;
  const expired = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (!paymentDueAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [paymentDueAt]);

  useEffect(() => {
    if (liveStatus === 'paid') {
      router.replace(`/checkout/success/${code}`);
    } else if (liveStatus === 'failed' || liveStatus === 'refunded') {
      router.replace(`/checkout/failed/${code}`);
    }
  }, [liveStatus, code, router]);

  useEffect(() => {
    if (!expired) return;
    const id = window.setTimeout(() => router.refresh(), 1500);
    return () => window.clearTimeout(id);
  }, [expired, router]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyMessage('');
    const result = await getOrderPaymentStatusByCode(code);
    setVerifying(false);

    if (result.success && result.payment_status === 'paid') {
      router.replace(`/checkout/success/${code}`);
      return;
    }
    if (result.success && (result.payment_status === 'failed' || result.order_status === 'cancelled')) {
      router.replace(`/checkout/failed/${code}`);
      return;
    }
    setVerifyMessage(
      result.success
        ? 'Hệ thống chưa nhận được giao dịch khớp đơn hàng. Vui lòng kiểm tra đúng số tiền và nội dung chuyển khoản, rồi thử lại sau vài giây.'
        : result.error,
    );
  };

  const vietQrUrl = buildVietQrUrl(amount, code);

  return (
    <div className={styles.qrAction}>
      <p className={styles.qrLabel}>Quét mã bằng ứng dụng Ngân hàng</p>
      <div className={styles.qrWrapper}>
        <Image src={vietQrUrl} alt="VietQR" width={220} height={220} unoptimized />
      </div>
      <div className={styles.bankInfoLite}>
        <p>{VEGANGLOW_BANK.id} Bank • {VEGANGLOW_BANK.account}</p>
        <p>{VEGANGLOW_BANK.name}</p>
        <p>Nội dung: {bankTransferContent(code)}</p>
        {paymentDueAt && (
          <p style={{ marginTop: '0.5rem', fontWeight: 700, color: expired ? '#b91c1c' : 'var(--color-primary-dark)' }}>
            {expired ? 'Đã hết hạn — đang xử lý...' : `Còn lại: ${formatRemaining(remaining ?? 0)}`}
          </p>
        )}
      </div>

      {verifyMessage && (
        <div className={styles.errorBox} style={{ marginBottom: '1rem' }}>
          <AlertCircle size={18} />
          {verifyMessage}
        </div>
      )}

      <button onClick={handleVerify} className={styles.submitBtn} disabled={verifying || expired}>
        {verifying ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Đang kiểm tra...
          </>
        ) : (
          'Tôi đã chuyển khoản, kiểm tra lại'
        )}
      </button>
    </div>
  );
}
