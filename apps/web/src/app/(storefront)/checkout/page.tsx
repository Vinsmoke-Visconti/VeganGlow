'use client';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import styles from './checkout.module.css';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { createOrder } from '@/app/actions/checkout';

export default function CheckoutPage() {
  const { cartItems, totalAmount, clearCart } = useCart();
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderCode, setOrderCode] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (isSuccess) {
    return (
      <div className={styles.container} style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          style={{ textAlign: 'center', maxWidth: '500px' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}
          >
            <CheckCircle2 size={80} color="#10b981" />
          </motion.div>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#064e3b' }}>Đặt hàng thành công!</h1>
          <p style={{ color: '#4b5563', marginBottom: '2rem', lineHeight: 1.6 }}>
            Cảm ơn bạn đã tin tưởng và lựa chọn VeganGlow. Đơn hàng của bạn đang được xử lý và sẽ được giao trong thời gian sớm nhất.
            <br />
            Mã đơn hàng: <strong>#{orderCode}</strong>
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/orders" style={{ display: 'inline-block', backgroundColor: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
              Xem đơn hàng
            </Link>
            <Link href="/products" style={{ display: 'inline-block', border: '1px solid #10b981', color: '#10b981', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
              Tiếp tục mua sắm
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className={styles.container} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>Không có sản phẩm để thanh toán</h2>
        <Link href="/products" style={{ color: '#10b981', marginTop: '1rem', display: 'inline-block' }}>Quay lại cửa hàng</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg('');
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const paymentMethod = (formData.get('payment') as string) === 'card' ? 'card' : 'cod';

    const result = await createOrder({
      items: cartItems.map((it) => ({ id: it.id, quantity: it.quantity })),
      customer_name: (formData.get('customer_name') as string) || '',
      phone: (formData.get('phone') as string) || '',
      email: (formData.get('email') as string) || '',
      address: (formData.get('address') as string) || '',
      city: (formData.get('city') as string) || 'TP. Hồ Chí Minh',
      payment_method: paymentMethod,
      note: (formData.get('note') as string) || '',
    });

    setSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error);
      return;
    }

    setOrderCode(result.order_code);
    clearCart();
    setIsSuccess(true);
  };

  return (
    <div className={styles.container}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/cart" className={styles.backLink}>
          <ArrowLeft size={18} /> Quay lại giỏ hàng
        </Link>
        <h1 className={styles.title}>Thanh toán</h1>
      </motion.div>

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={styles.formSection}
        >
          <div className={styles.card}>
            <h2>Thông tin giao hàng</h2>
            {errorMsg && (
              <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}
            <form id="checkout-form" onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Họ và tên</label>
                  <input name="customer_name" type="text" required maxLength={120} placeholder="Nhập họ và tên..." />
                </div>
                <div className={styles.formGroup}>
                  <label>Số điện thoại</label>
                  <input name="phone" type="tel" required pattern="(0|\+84)\d{9,10}" placeholder="VD: 0901234567" />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Email</label>
                  <input name="email" type="email" required placeholder="Nhập địa chỉ email..." />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Địa chỉ giao hàng</label>
                  <input name="address" type="text" required maxLength={250} placeholder="Số nhà, tên đường, phường/xã..." />
                </div>
                <div className={styles.formGroup}>
                  <label>Tỉnh / Thành phố</label>
                  <input name="city" type="text" required defaultValue="TP. Hồ Chí Minh" maxLength={100} />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Ghi chú (Tùy chọn)</label>
                  <textarea name="note" rows={3} maxLength={500} placeholder="Ghi chú thêm về đơn hàng..."></textarea>
                </div>
              </div>

              <h2 style={{ marginTop: '2rem' }}>Phương thức thanh toán</h2>
              <div className={styles.paymentMethods}>
                <label className={styles.paymentMethod}>
                  <input type="radio" name="payment" value="cod" defaultChecked />
                  <span>Thanh toán khi nhận hàng (COD)</span>
                </label>
                <label className={styles.paymentMethod} style={{ opacity: 0.6 }}>
                  <input type="radio" name="payment" value="card" disabled />
                  <span>Chuyển khoản ngân hàng (Đang bảo trì)</span>
                </label>
              </div>
            </form>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={styles.summarySection}
        >
          <div className={styles.card}>
            <h2>Đơn hàng của bạn</h2>
            <div className={styles.summaryItems}>
              {cartItems.map(item => (
                <div key={item.id} className={styles.summaryItem}>
                  <div className={styles.summaryItemInfo}>
                    <span className={styles.summaryItemName}>{item.name}</span>
                    <span className={styles.summaryItemQty}>x{item.quantity}</span>
                  </div>
                  <span className={styles.summaryItemPrice}>
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.summaryDivider}></div>
            <div className={styles.summaryRow}>
              <span>Tạm tính</span>
              <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Phí giao hàng</span>
              <span>Miễn phí</span>
            </div>
            <div className={styles.summaryDivider}></div>
            <div className={styles.totalRow}>
              <span>Tổng thanh toán</span>
              <span className={styles.totalPrice}>{totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className={styles.submitBtn}
              style={submitting ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
            >
              {submitting ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={16} className="animate-spin" /> Đang xử lý...
                </span>
              ) : (
                'Hoàn tất đặt hàng'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
