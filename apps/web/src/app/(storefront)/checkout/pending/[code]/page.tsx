import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { getPublicOrderByCode } from '@/app/actions/checkout';
import { normalizeProductImage } from '@/lib/imageUrl';
import styles from '../../checkout.module.css';
import { PendingPaymentClient } from './PendingPaymentClient';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ code: string }> };

export default async function CheckoutPendingPage({ params }: Props) {
  const { code } = await params;

  const result = await getPublicOrderByCode(code);

  if (!result.ok) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successContent}>
          <h1 className={styles.successTitle}>Không tìm thấy đơn hàng</h1>
          <p className={styles.successText}>
            Đường dẫn không hợp lệ hoặc đơn hàng đã bị xóa.
          </p>
          <Link href="/products" className={styles.submitBtn} style={{ width: 'auto', display: 'inline-flex', padding: '1rem 2rem' }}>
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  const order = result.order;

  if (order.payment_method === 'cod') {
    redirect(`/checkout/success/${order.code}`);
  }

  if (order.payment_status === 'paid') {
    redirect(`/checkout/success/${order.code}`);
  }

  if (order.status === 'cancelled' || order.payment_status === 'failed') {
    redirect(`/checkout/failed/${order.code}`);
  }

  return (
    <div className={styles.container}>
      <Link href="/orders" className={styles.backLink}>
        <ArrowLeft size={18} /> Đơn hàng của tôi
      </Link>

      <h1 className={styles.title}>Hoàn tất thanh toán</h1>

      <div className={styles.successContainer} style={{ padding: 0, alignItems: 'flex-start' }}>
        <div className={styles.successContent} style={{ maxWidth: 880, padding: 0, overflow: 'hidden', textAlign: 'left' }}>
          <div className={styles.paymentFlowLayout}>
            <div className={styles.orderSummarySide}>
              <div className={styles.miniBadge}>ĐƠN HÀNG</div>
              <h2 className={styles.orderCode}>#{order.code}</h2>
              <div className={styles.orderTotalDisplay}>
                <span>Tổng tiền cần chuyển</span>
                <strong>{order.total_amount.toLocaleString('vi-VN')}đ</strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {order.items.slice(0, 4).map((it, i) => {
                  const img = normalizeProductImage(it.product_image ?? '');
                  return (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.85rem', opacity: 0.9 }}>
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
                      <span style={{ opacity: 0.75 }}>×{it.quantity}</span>
                    </div>
                  );
                })}
                {order.items.length > 4 && (
                  <div style={{ fontSize: '0.78rem', opacity: 0.6 }}>
                    +{order.items.length - 4} sản phẩm khác
                  </div>
                )}
              </div>

              <div className={styles.summaryFooter}>
                <p>Đơn hàng được giữ chỗ. Tồn kho sẽ được hoàn lại nếu hết hạn thanh toán.</p>
              </div>
            </div>

            <div className={styles.paymentActionSide}>
              <PendingPaymentClient
                orderId={order.id}
                code={order.code}
                amount={order.total_amount}
                paymentDueAt={order.payment_due_at}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
