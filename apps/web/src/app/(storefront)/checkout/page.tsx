'use client';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
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
  Minus,
  Plus,
  Trash2,
  Tag as TagIcon,
} from 'lucide-react';
import { validateVoucher } from '@/app/actions/vouchers';
import styles from './checkout.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createOrder } from '@/app/actions/checkout';
import { VnAddressSelect, emptyVnAddress, type VnAddressValue } from '@/components/shared/VnAddressSelect';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  clearBuyNow,
  getBuyNow,
  updateBuyNowQuantity,
  type BuyNowItem,
} from '@/lib/buyNow';
import { normalizeProductImage } from '@/lib/imageUrl';

interface ProfileRow {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  ward: string | null;
  ward_code: string | null;
  province: string | null;
  province_code: string | null;
}

function createCheckoutIdempotencyKey(): string {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `checkout:${random}`;
}

function CheckoutContent() {
  const cart = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const buyNowFlag = searchParams.get('buyNow') === '1';
  const idempotencyKeyRef = useRef(createCheckoutIdempotencyKey());

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [address, setAddress] = useState<VnAddressValue>(emptyVnAddress);
  const [prefill, setPrefill] = useState<{ full_name: string; phone: string; email: string; address: string } | null>(null);

  const [buyNowItem, setBuyNowItem] = useState<BuyNowItem | null>(null);
  const [buyNowReady, setBuyNowReady] = useState(false);

  // Voucher state
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;
    title: string;
  } | null>(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  useEffect(() => {
    if (!buyNowFlag) {
      setBuyNowReady(true);
      return;
    }
    const found = getBuyNow();
    setBuyNowItem(found);
    setBuyNowReady(true);
  }, [buyNowFlag]);

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
          setPrefill((prev) => ({
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

  const isBuyNowMode = buyNowFlag && !!buyNowItem;

  const items = useMemo(() => {
    if (isBuyNowMode && buyNowItem) {
      return [buyNowItem];
    }
    return cart.cartItems;
  }, [isBuyNowMode, buyNowItem, cart.cartItems]);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.quantity, 0),
    [items],
  );

  const totalAmount = useMemo(() => {
    const baseTotal = subtotal;
    const discount = appliedVoucher?.discount || 0;
    return Math.max(0, baseTotal - discount);
  }, [subtotal, appliedVoucher]);

  const updateItemQty = (id: string, nextQty: number) => {
    if (nextQty < 1) return;
    if (isBuyNowMode) {
      const next = updateBuyNowQuantity(nextQty);
      setBuyNowItem(next);
    } else {
      cart.updateQuantity(id, nextQty);
    }
  };

  const removeItem = (id: string, name: string) => {
    if (isBuyNowMode) {
      if (window.confirm(`Hủy mua "${name}"?`)) {
        clearBuyNow();
        setBuyNowItem(null);
      }
    } else {
      if (window.confirm(`Xóa "${name}" khỏi giỏ hàng?`)) {
        cart.removeFromCart(id);
      }
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setCheckingVoucher(true);
    setVoucherError('');

    try {
      const res = await validateVoucher(voucherInput, subtotal);
      if (res.ok) {
        setAppliedVoucher({
          code: res.voucherCode!,
          discount: res.discount!,
          title: res.title!,
        });
        setVoucherInput('');
      } else {
        setVoucherError(res.error || 'Mã không hợp lệ');
      }
    } catch {
      setVoucherError('Lỗi kiểm tra mã giảm giá');
    } finally {
      setCheckingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError('');
  };

  if (buyNowReady && items.length === 0) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successContent}>
          <div className={styles.successIcon}>
            <Package size={80} color="var(--color-text-muted)" />
          </div>
          <h2 className={styles.successTitle}>
            {buyNowFlag ? 'Không có sản phẩm để thanh toán' : 'Giỏ hàng trống'}
          </h2>
          <p className={styles.successText}>
            {buyNowFlag
              ? 'Phiên mua ngay đã hết hạn. Vui lòng quay lại sản phẩm và thử lại.'
              : 'Bạn chưa có sản phẩm nào trong giỏ hàng để thực hiện thanh toán.'}
          </p>
          <Link href="/products" className={styles.submitBtn} style={{ width: 'auto', display: 'inline-flex', padding: '1rem 2rem' }}>
            Quay lại cửa hàng
          </Link>
        </div>
      </div>
    );
  }

  if (!buyNowReady) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successContent}>
          <Loader2 size={48} className="animate-spin" />
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

    if (items.length === 0) {
      setErrorMsg('Không có sản phẩm để thanh toán.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const paymentMethod = (formData.get('payment') as string) === 'bank_transfer' ? 'bank_transfer' : 'cod';

    const result = await createOrder({
      items: items.map((it) => ({ id: it.id, quantity: it.quantity })),
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
      idempotency_key: idempotencyKeyRef.current,
      voucher_code: appliedVoucher?.code,
    });

    if (!result.success) {
      setSubmitting(false);
      setErrorMsg(result.error);
      return;
    }

    try {
      sessionStorage.setItem('vg:lastOrderCode', result.order_code);
    } catch {
      // sessionStorage may be unavailable in private mode; non-fatal.
    }

    if (isBuyNowMode) {
      clearBuyNow();
    } else {
      cart.clearCart();
    }
    idempotencyKeyRef.current = createCheckoutIdempotencyKey();

    router.replace(
      paymentMethod === 'bank_transfer'
        ? `/checkout/pending/${result.order_code}`
        : `/checkout/success/${result.order_code}`,
    );
  };

  return (
    <div className={styles.container}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Link href={isBuyNowMode ? '/products' : '/cart'} className={styles.backLink}>
          <ArrowLeft size={18} />
          {isBuyNowMode ? 'Quay lại sản phẩm' : 'Quay lại giỏ hàng'}
        </Link>
        <h1 className={styles.title}>
          Thanh toán
          {isBuyNowMode && <span className={styles.modeBadge}>Mua ngay</span>}
        </h1>
        {isBuyNowMode && (
          <p className={styles.modeHint}>
            Bạn đang mua nhanh sản phẩm này. Giỏ hàng hiện tại không bị ảnh hưởng.
          </p>
        )}
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
                <label className={styles.paymentMethod}>
                  <input type="radio" name="payment" value="bank_transfer" />
                  <div className={styles.paymentMethodContent}>
                    <span className={styles.paymentMethodName}>Chuyển khoản ngân hàng (VietQR)</span>
                    <span className={styles.paymentMethodDesc}>Nhận mã QR để thanh toán qua ứng dụng ngân hàng ngay sau khi đặt hàng</span>
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
              <AnimatePresence>
                {items.map((item) => {
                  const img = normalizeProductImage(item.image);
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={styles.summaryItem}
                    >
                      {img && (
                        <div className={styles.summaryItemImageWrapper}>
                          <Image
                            src={img}
                            alt={item.name || 'Sản phẩm'}
                            width={56}
                            height={56}
                            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '8px' }}
                            unoptimized
                          />
                        </div>
                      )}
                      <div className={styles.summaryItemContent}>
                        <span className={styles.summaryItemName}>{item.name}</span>
                        <div className={styles.qtyRow}>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            onClick={() => updateItemQty(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="Giảm số lượng"
                          >
                            <Minus size={14} />
                          </button>
                          <span className={styles.qtyValue}>{item.quantity}</span>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            onClick={() => updateItemQty(item.id, item.quantity + 1)}
                            aria-label="Tăng số lượng"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => removeItem(item.id, item.name)}
                            aria-label="Xóa sản phẩm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <span className={styles.summaryItemPrice}>
                        {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className={styles.summaryDivider}></div>

            <div className={styles.summaryRow}>
              <span>Tạm tính</span>
              <span>{subtotal.toLocaleString('vi-VN')}đ</span>
            </div>

            {appliedVoucher && (
              <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--vg-leaf-600)' }}>
                  <TagIcon size={16} /> Giảm giá ({appliedVoucher.code})
                  <button
                    type="button"
                    onClick={removeVoucher}
                    className={styles.removeVoucherBtn}
                  >
                    Xóa
                  </button>
                </span>
                <span style={{ color: 'var(--vg-leaf-600)', fontWeight: 700 }}>
                  -{appliedVoucher.discount.toLocaleString('vi-VN')}đ
                </span>
              </div>
            )}
            <div className={styles.summaryRow}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={16} /> Phí giao hàng
              </span>
              <span style={{ color: 'var(--color-primary)' }}>Miễn phí</span>
            </div>

            <div className={styles.voucherSection}>
              <div className={styles.voucherInputWrap}>
                <input
                  type="text"
                  placeholder="Mã giảm giá..."
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  className={styles.voucherInput}
                />
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={checkingVoucher || !voucherInput.trim()}
                  className={styles.voucherBtn}
                >
                  {checkingVoucher ? <Loader2 size={16} className="animate-spin" /> : 'Áp dụng'}
                </button>
              </div>
              {voucherError && <p className={styles.voucherError}>{voucherError}</p>}
              {appliedVoucher && (
                <p className={styles.voucherSuccess}>
                  Đã áp dụng: <strong>{appliedVoucher.title}</strong>
                </p>
              )}
            </div>

            <div className={styles.summaryDivider}></div>

            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Tổng thanh toán</span>
              <span className={styles.totalPrice}>{totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting || items.length === 0}
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

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.successContainer}>
          <div className={styles.successContent}>
            <Loader2 size={48} className="animate-spin" />
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
