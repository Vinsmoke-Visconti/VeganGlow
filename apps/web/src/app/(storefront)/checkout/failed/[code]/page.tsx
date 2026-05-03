import { redirect } from 'next/navigation';
import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { getPublicOrderByCode } from '@/app/actions/checkout';
import { isBankTransferMethod } from '@/lib/payment';
import styles from '../../checkout.module.css';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ code: string }> };

export default async function CheckoutFailedPage({ params }: Props) {
  const { code } = await params;

  const result = await getPublicOrderByCode(code);

  if (!result.ok) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successContent}>
          <h1 className={styles.successTitle}>Không tìm thấy đơn hàng</h1>
          <p className={styles.successText}>Đường dẫn không hợp lệ.</p>
          <Link href="/products" className={styles.submitBtn} style={{ width: 'auto', display: 'inline-flex', padding: '1rem 2rem' }}>
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  const order = result.order;

  if (order.payment_status === 'paid' && order.status !== 'cancelled') {
    redirect(`/checkout/success/${order.code}`);
  }

  const isBankTransfer = isBankTransferMethod(order.payment_method);
  const expired =
    isBankTransfer && order.status === 'cancelled' && order.payment_status === 'failed';

  if (
    isBankTransfer &&
    order.status === 'pending' &&
    (order.payment_status === 'pending' || order.payment_status === 'unpaid')
  ) {
    redirect(`/checkout/pending/${order.code}`);
  }

  return (
    <div className={styles.successContainer}>
      <div className={styles.successContent}>
        <div className={styles.successIcon}>
          <XCircle size={80} color="#dc2626" />
        </div>
        <h1 className={styles.successTitle}>
          {expired ? 'Đơn hàng đã hết hạn thanh toán' : 'Thanh toán không thành công'}
        </h1>
        <p className={styles.successText}>
          {expired
            ? 'Hệ thống đã hủy đơn và hoàn lại tồn kho. Bạn có thể đặt lại nếu cần.'
            : 'Đơn hàng đã bị hủy hoặc không thể tiếp tục thanh toán. Vui lòng đặt lại hoặc liên hệ hỗ trợ.'}
          <br />
          Mã đơn hàng: <strong>#{order.code}</strong>
        </p>

        <div className={styles.successActions}>
          <Link href="/cart" className={styles.submitBtn} style={{ width: 'auto', padding: '1rem 2rem' }}>
            Đặt hàng lại
          </Link>
          <Link href="/contact" className={styles.cartBtn} style={{ width: 'auto', padding: '1rem 2rem' }}>
            Liên hệ hỗ trợ
          </Link>
        </div>
      </div>
    </div>
  );
}
