'use client';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  Package, 
  CreditCard, 
  MapPin, 
  Truck, 
  Info, 
  AlertCircle,
  User,
  Phone,
  Mail,
  FileText,
  ArrowRight
} from 'lucide-react';
import styles from './checkout.module.css';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createOrder } from '@/app/actions/checkout';
import { VnAddressSelect, emptyVnAddress, type VnAddressValue } from '@/components/shared/VnAddressSelect';
import { createBrowserClient } from '@/lib/supabase/client';

interface ProfileRow {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  ward: string | null;
  ward_code: string | null;
  province: string | null;
  province_code: string | null;
}

export default function CheckoutPage() {
  const { cartItems, totalAmount, clearCart } = useCart();
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderCode, setOrderCode] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [address, setAddress] = useState<VnAddressValue>(emptyVnAddress);
  const [prefill, setPrefill] = useState<{ full_name: string; phone: string; email: string; address: string } | null>(null);

  // Prefill from saved profile, if logged in
  useEffect(() => {
    let alive = true;
    const supabase = createBrowserClient();
    
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (!user || !alive) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, address, ward, ward_code, province, province_code')
        .eq('id', user.id)
        .maybeSingle();

      if (!alive || error || !data) {
        if (alive) {
          setPrefill(prev => ({
            ...prev,
            full_name: user.user_metadata?.full_name || '',
            email: user.email || '',
            phone: '',
            address: '',
          }));
        }
        return;
      }

      const row = data as ProfileRow;
      if (alive) {
        setPrefill({
          full_name: row.full_name || user.user_metadata?.full_name || '',
          phone: row.phone || '',
          email: user.email || '',
          address: row.address || '',
        });
        
        if (row.province_code && row.ward_code) {
          setAddress({
            province_code: row.province_code,
            province: row.province || '',
            ward_code: row.ward_code,
            ward: row.ward || '',
          });
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={styles.successContent}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className={styles.successIcon}
          >
            <CheckCircle2 size={80} color="var(--color-primary)" />
          </motion.div>
          <h1 className={styles.successTitle}>Đặt hàng thành công!</h1>
          <p className={styles.successText}>
            Cảm ơn bạn đã tin tưởng và lựa chọn VeganGlow. Đơn hàng của bạn đang được xử lý và sẽ được giao trong thời gian sớm nhất.
            <br />
            Mã đơn hàng: <strong>#{orderCode}</strong>
          </p>
          <div className={styles.successActions}>
            <Link href="/orders" className={styles.submitBtn} style={{ width: 'auto', padding: '1rem 2rem' }}>
              Xem đơn hàng
            </Link>
            <Link href="/products" className={styles.cartBtn} style={{ width: 'auto', padding: '1rem 2rem' }}>
              Tiếp tục mua sắm <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successContent}>
          <div className={styles.successIcon}>
            <Package size={80} color="var(--color-text-muted)" />
          </div>
          <h2 className={styles.successTitle}>Giỏ hàng trống</h2>
          <p className={styles.successText}>Bạn chưa có sản phẩm nào trong giỏ hàng để thực hiện thanh toán.</p>
          <Link href="/products" className={styles.submitBtn} style={{ width: 'auto', display: 'inline-flex', padding: '1rem 2rem' }}>
            Quay lại cửa hàng
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg('');

    if (!address.province_code || !address.ward_code) {
      setErrorMsg('Vui lòng chọn Tỉnh/Thành phố và Phường/Xã.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const paymentMethod = (formData.get('payment') as string) === 'card' ? 'card' : 'cod';

    const result = await createOrder({
      items: cartItems.map((it) => ({ id: it.id, quantity: it.quantity })),
      customer_name: (formData.get('customer_name') as string) || '',
      phone: (formData.get('phone') as string) || '',
      email: (formData.get('email') as string) || '',
      address: (formData.get('address') as string) || '',
      ward: address.ward,
      ward_code: address.ward_code,
      province: address.province,
      province_code: address.province_code,
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
            <h2><Package size={24} /> Thông tin giao hàng</h2>
            
            {errorMsg && (
              <div className={styles.errorBox}>
                <AlertCircle size={20} />
                {errorMsg}
              </div>
            )}

            <form id="checkout-form" onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label><User size={16} /> Họ và tên</label>
                  <input name="customer_name" type="text" required maxLength={120} placeholder="Nhập họ và tên..." defaultValue={prefill?.full_name} />
                </div>
                <div className={styles.formGroup}>
                  <label><Phone size={16} /> Số điện thoại</label>
                  <input name="phone" type="tel" required pattern="(0|\+84)\d{9,10}" placeholder="VD: 0901234567" defaultValue={prefill?.phone} />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label><Mail size={16} /> Email</label>
                  <input name="email" type="email" required placeholder="Nhập địa chỉ email..." defaultValue={prefill?.email} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <VnAddressSelect value={address} onChange={setAddress} required />
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label><MapPin size={16} /> Số nhà, tên đường</label>
                  <input name="address" type="text" required maxLength={250} placeholder="VD: 12 Nguyễn Văn Cừ" defaultValue={prefill?.address} />
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label><FileText size={16} /> Ghi chú (Tùy chọn)</label>
                  <textarea name="note" rows={3} maxLength={500} placeholder="Ghi chú thêm về đơn hàng..."></textarea>
                </div>
              </div>

              <h2 style={{ marginTop: '3rem' }}><CreditCard size={24} /> Phương thức thanh toán</h2>
              <div className={styles.paymentMethods}>
                <label className={styles.paymentMethod}>
                  <input type="radio" name="payment" value="cod" defaultChecked />
                  <div className={styles.paymentMethodContent}>
                    <span className={styles.paymentMethodName}>Thanh toán khi nhận hàng (COD)</span>
                    <span className={styles.paymentMethodDesc}>Thanh toán bằng tiền mặt khi shipper giao hàng đến</span>
                  </div>
                </label>
                <label className={styles.paymentMethod} style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                  <input type="radio" name="payment" value="card" disabled />
                  <div className={styles.paymentMethodContent}>
                    <span className={styles.paymentMethodName}>Chuyển khoản ngân hàng</span>
                    <span className={styles.paymentMethodDesc}>Đang bảo trì hệ thống thanh toán tự động</span>
                  </div>
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
            <h2><Package size={24} /> Đơn hàng của bạn</h2>
            <div className={styles.summaryItems}>
              {cartItems.map(item => (
                <div key={item.id} className={styles.summaryItem}>
                  {item.image && (
                    <div className={styles.summaryItemImageWrapper}>
                      <img 
                        src={item.image} 
                        alt={item.name || 'Sản phẩm'} 
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '4px' }}
                      />
                    </div>
                  )}
                  <div className={styles.summaryItemContent}>
                    <span className={styles.summaryItemName}>{item.name}</span>
                    <span className={styles.summaryItemQty}>Số lượng: {item.quantity}</span>
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
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={16} /> Phí giao hàng
              </span>
              <span style={{ color: 'var(--color-primary)' }}>Miễn phí</span>
            </div>
            
            <div className={styles.summaryDivider}></div>
            
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Tổng thanh toán</span>
              <span className={styles.totalPrice}>{totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className={styles.submitBtn}
            >
              {submitting ? (
                <>
                  <Loader2 size={24} className="animate-spin" /> Đang xử lý...
                </>
              ) : (
                'Hoàn tất đặt hàng'
              )}
            </button>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center', justifyContent: 'center' }}>
              <Info size={14} /> Nhấn &ldquo;Hoàn tất đặt hàng&rdquo; đồng nghĩa với việc bạn đồng ý với Điều khoản của VeganGlow.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
