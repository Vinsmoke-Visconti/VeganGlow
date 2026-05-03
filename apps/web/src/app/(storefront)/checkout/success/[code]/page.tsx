import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import { getPublicOrderByCode } from '@/app/actions/checkout';
import { isBankTransferMethod } from '@/lib/payment';
import { normalizeProductImage } from '@/lib/imageUrl';
import styles from '../../checkout.module.css';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ code: string }> };

export default async function CheckoutSuccessPage({ params }: Props) {
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
  const isBankTransfer = isBankTransferMethod(order.payment_method);

  if (order.status === 'cancelled') {
    redirect(`/checkout/failed/${order.code}`);
  }

  if (isBankTransfer && order.payment_status !== 'paid') {
    redirect(`/checkout/pending/${order.code}`);
  }

  return (
    <div className={styles.successContainer}>
      <div className={styles.successContent}>
        <div className={styles.successIcon}>
          <CheckCircle2 size={80} color="var(--color-primary)" />
        </div>
        <h1 className={styles.successTitle}>
          {isBankTransfer ? 'Thanh toán đã được xác nhận!' : 'Đặt hàng thành công!'}
        </h1>
        <p className={styles.successText}>
          {isBankTransfer
            ? 'Giao dịch của bạn đã được xác nhận từ ngân hàng. Chúng tôi sẽ xử lý và giao hàng sớm nhất.'
            : 'Cảm ơn bạn đã tin tưởng VeganGlow. Đơn hàng của bạn đang được xử lý và sẽ được giao sớm nhất.'}
          <br />
          Mã đơn hàng: <strong>#{order.code}</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          {order.items.slice(0, 4).map((it, i) => {
            const img = normalizeProductImage(it.product_image ?? '');
            return (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {img && (
                  <Image
                    src={img}
                    alt={it.product_name}
                    width={36}
                    height={36}
                    style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
                    unoptimized
                  />
                )}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.product_name}
                </span>
                <span>×{it.quantity}</span>
              </div>
            );
          })}
          {order.items.length > 4 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              +{order.items.length - 4} sản phẩm khác
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-light)', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
            <span>Tổng cộng</span>
            <span>{order.total_amount.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>

        <div className={styles.successActions}>
          <Link href="/orders" className={styles.submitBtn} style={{ width: 'auto', padding: '1rem 2rem' }}>
            Xem đơn hàng
          </Link>
          <Link href="/products" className={styles.cartBtn} style={{ width: 'auto', padding: '1rem 2rem' }}>
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </div>
  );
}
