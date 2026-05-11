'use client';

import { useCart } from '@/context/CartContext';
import { FREESHIP_THRESHOLD } from '@/lib/payment';
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
  const [isRedirecting, setIsRedirecting] = useState(false);
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
  const [availableVouchers, setAvailableVouchers] = useState<Array<{
    id: string; code: string; title: string; discount_type: string;
    discount_value: number; min_order: number; expires_at: string | null;
  }>>([]);
  const [showVoucherPicker, setShowVoucherPicker] = useState(false);

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

      // Fetch profile
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

      // Fetch available vouchers
      const { data: vList } = await (supabase.from('vouchers') as any)
        .select('id, code, title, discount_type, discount_value, min_order, expires_at, starts_at, quota, used_count')
        .eq('status', 'active');
      if (alive && vList) {
        const _now = new Date();
        setAvailableVouchers(
          (vList as any[]).filter((v: any) => {
            if (v.quota > 0 && v.used_count >= v.quota) return false;
            if (v.expires_at && new Date(v.expires_at) < _now) return false;
            if (v.starts_at && new Date(v.starts_at) > _now) return false;
            return true;
          })
        );
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

  const isFreeship = subtotal >= FREESHIP_THRESHOLD;
  const shippingFee = isFreeship ? 0 : 30000; // 30k demo shipping

  const totalAmount = useMemo(() => {
    const discount = appliedVoucher?.discount || 0;
    return Math.max(0, subtotal + shippingFee - discount);
  }, [subtotal, shippingFee, appliedVoucher]);

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

  if (buyNowReady && items.length === 0 && !isRedirecting) {
    return (
      <div className={styles.page}>
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
      </div>
    );
  }

  if (!buyNowReady) {
    return (
      <div className={styles.page}>
        <div className={styles.successContainer}>
          <div className={styles.successContent}>
            <Loader2 size={48} className="animate-spin" />
          </div>
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
      // Store PayOS URL for the pending page to use as fallback
      if (result.payos_checkout_url) {
        sessionStorage.setItem('vg:payosUrl:' + result.order_code, result.payos_checkout_url);
      }
    } catch {
      // sessionStorage may be unavailable in private mode; non-fatal.
    }

    setIsRedirecting(true);

    if (isBuyNowMode) {
      clearBuyNow();
    } else {
      cart.clearCart();
    }
    idempotencyKeyRef.current = createCheckoutIdempotencyKey();

    if (paymentMethod === 'bank_transfer') {
      // If PayOS provided a checkout URL, redirect there directly
      if (result.payos_checkout_url) {
        window.location.href = result.payos_checkout_url;
      } else {
        // Fallback to VietQR pending page
        router.replace(`/checkout/pending/${result.order_code}`);
      }
    } else {
      router.replace(`/checkout/success/${result.order_code}`);
    }
  };

  return (
    <div className={styles.page}>
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
                    <span className={styles.paymentMethodName}>Thanh toán PayOS / Chuyển khoản</span>
                    <span className={styles.paymentMethodDesc}>Thanh toán qua cổng PayOS hoặc quét mã QR ngay sau khi đặt hàng</span>
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
              {isFreeship ? (
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Miễn phí</span>
              ) : (
                <span style={{ fontWeight: 600 }}>{shippingFee.toLocaleString('vi-VN')}đ</span>
              )}
            </div>
            {!isFreeship && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', paddingLeft: '1.5rem' }}>
                Mua thêm {(FREESHIP_THRESHOLD - subtotal).toLocaleString('vi-VN')}đ để được miễn phí vận chuyển
              </div>
            )}

            <div className={styles.voucherSection}>
              {/* Voucher picker toggle */}
              {!appliedVoucher && availableVouchers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowVoucherPicker(!showVoucherPicker)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                    padding: '0.625rem 0.875rem', background: 'var(--color-primary-50)',
                    border: '1px dashed var(--color-primary-200)', borderRadius: 'var(--radius-md)',
                    color: 'var(--color-primary-dark)', fontSize: '0.8125rem', fontWeight: 600,
                    cursor: 'pointer', marginBottom: '0.75rem', transition: 'all 0.2s ease',
                  }}
                >
                  <TagIcon size={16} />
                  {showVoucherPicker ? 'Ẩn danh sách voucher' : `Chọn voucher (${availableVouchers.length} có sẵn)`}
                </button>
              )}

              {/* Available voucher list */}
              {showVoucherPicker && !appliedVoucher && (
                <div style={{
                  maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column',
                  gap: '0.5rem', marginBottom: '0.75rem', paddingRight: '0.25rem',
                }}>
                  {availableVouchers.map((v) => {
                    const eligible = subtotal >= Number(v.min_order);
                    const label = v.discount_type === 'shipping'
                      ? 'Miễn phí ship'
                      : v.discount_type === 'percent'
                      ? `Giảm ${v.discount_value}%`
                      : `Giảm ${Number(v.discount_value).toLocaleString('vi-VN')}đ`;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!eligible || checkingVoucher}
                        onClick={() => {
                          setVoucherInput(v.code);
                          setShowVoucherPicker(false);
                          // Auto-apply
                          setVoucherInput(v.code);
                          setTimeout(async () => {
                            setCheckingVoucher(true);
                            setVoucherError('');
                            try {
                              const res = await validateVoucher(v.code, subtotal);
                              if (res.ok) {
                                setAppliedVoucher({ code: res.voucherCode!, discount: res.discount!, title: res.title! });
                                setVoucherInput('');
                              } else {
                                setVoucherError(res.error || 'Mã không hợp lệ');
                              }
                            } catch { setVoucherError('Lỗi kiểm tra mã'); }
                            finally { setCheckingVoucher(false); }
                          }, 0);
                        }}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.625rem 0.875rem', border: '1px solid var(--color-border-light)',
                          borderRadius: 'var(--radius-md)', background: eligible ? 'white' : 'var(--color-bg-secondary)',
                          cursor: eligible ? 'pointer' : 'not-allowed', opacity: eligible ? 1 : 0.55,
                          transition: 'all 0.15s ease', textAlign: 'left',
                        }}
                        onMouseOver={(e) => eligible && (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                        onMouseOut={(e) => eligible && (e.currentTarget.style.borderColor = 'var(--color-border-light)')}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-primary-dark)' }}>
                            {v.title}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                            Mã: {v.code}
                            {v.min_order > 0 && ` · Đơn từ ${Number(v.min_order).toLocaleString('vi-VN')}đ`}
                          </span>
                        </div>
                        <span style={{
                          padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)',
                          background: eligible ? 'var(--color-primary-50)' : 'var(--color-bg-secondary)',
                          color: eligible ? 'var(--color-primary)' : 'var(--color-text-muted)',
                          fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
                        }}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Manual voucher input */}
              <div className={styles.voucherInputWrap}>
                <input
                  type="text"
                  placeholder="Nhập mã giảm giá..."
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  className={styles.voucherInput}
                  disabled={!!appliedVoucher}
                />
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={checkingVoucher || !voucherInput.trim() || !!appliedVoucher}
                  className={styles.voucherBtn}
                >
                  {checkingVoucher ? <Loader2 size={16} className="animate-spin" /> : 'Áp dụng'}
                </button>
              </div>
              {voucherError && <p className={styles.voucherError}>{voucherError}</p>}
              {appliedVoucher && (
                <p className={styles.voucherSuccess}>
                  ✓ Đã áp dụng: <strong>{appliedVoucher.title}</strong>
                </p>
              )}
            </div>

            <div className={styles.summaryDivider}></div>

            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Tổng thanh toán</span>
              <span className={styles.totalPrice}>{totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)', color: 'var(--color-primary-dark)', fontSize: '0.8125rem', lineHeight: 1.6 }}>
              <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Thanh toán an toàn:</strong>
                <p style={{ margin: 0, opacity: 0.85 }}>Đơn hàng được xử lý qua cổng thanh toán PayOS. Thông tin của bạn được bảo mật tuyệt đối.</p>
              </div>
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
