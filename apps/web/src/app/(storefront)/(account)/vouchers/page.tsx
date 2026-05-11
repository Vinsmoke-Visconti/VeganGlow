'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import {
  Ticket,
  Clock,
  Tag,
  Loader2,
  ArrowLeft,
  Search,
  Truck,
  Percent,
  Calendar,
  Copy,
  CheckCircle2,
  Gift,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import styles from './vouchers.module.css';

interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order: number;
  end_date: string | null;
  starts_at: string | null;
  expires_at: string | null;
  status: string;
  quota: number;
  used_count: number;
  is_claimed?: boolean;
  is_used?: boolean;
}

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'shipping', label: 'Vận chuyển' },
  { value: 'discount', label: 'Giảm giá' },
] as const;

function VouchersContent() {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const supabase = createBrowserClient();

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch all active public vouchers
    const { data: allVouchers, error: vErr } = await (supabase
      .from('vouchers') as any)
      .select('id, code, title, description, discount_type, discount_value, min_order, starts_at, expires_at, status, quota, used_count')
      .eq('status', 'active');

    if (vErr) {
      console.error('Error fetching vouchers:', vErr);
      setLoading(false);
      return;
    }

    // Fetch user's claimed vouchers if logged in
    let claimedMap = new Map<string, boolean>();
    if (user) {
      const { data: userVouchers } = await supabase
        .from('user_vouchers')
        .select('voucher_id, is_used')
        .eq('user_id', user.id);

      if (userVouchers) {
        for (const uv of userVouchers as { voucher_id: string; is_used: boolean }[]) {
          claimedMap.set(uv.voucher_id, uv.is_used);
        }
      }
    }

    const now = new Date();
    const merged: Voucher[] = (allVouchers || [])
      .filter((v: any) => {
        // Filter out expired
        if (v.expires_at && new Date(v.expires_at) < now) return false;
        // Filter out not yet started
        if (v.starts_at && new Date(v.starts_at) > now) return false;
        // Filter out used-up quotas
        if (v.quota > 0 && v.used_count >= v.quota) return false;
        return true;
      })
      .map((v: any) => ({
        ...v,
        end_date: v.expires_at,
        is_claimed: claimedMap.has(v.id),
        is_used: claimedMap.get(v.id) ?? false,
      }));

    setVouchers(merged);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: vouchers.length, shipping: 0, discount: 0 };
    for (const v of vouchers) {
      if (v.discount_type === 'shipping') map.shipping++;
      else map.discount++;
    }
    return map;
  }, [vouchers]);

  const filteredVouchers = vouchers.filter((v) => {
    if (filter === 'shipping') return v.discount_type === 'shipping';
    if (filter === 'discount') return v.discount_type !== 'shipping';
    return true;
  }).filter((v) => {
    if (!searchCode.trim()) return true;
    return v.code.toLowerCase().includes(searchCode.toLowerCase()) ||
           v.title.toLowerCase().includes(searchCode.toLowerCase());
  });

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUseNow = (code: string) => {
    // Navigate to checkout or products with voucher pre-filled
    router.push(`/products?voucher=${encodeURIComponent(code)}`);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--space-4)' }}>
      <Link href="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Quay lại hồ sơ
      </Link>

      <div className={styles.wrapper} style={{ padding: '0' }}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-primary-50)', color: 'var(--color-primary)' }}>
                  <Ticket size={18} />
                </span>
                <h1 className={styles.title} style={{ margin: 0, fontSize: '1.75rem' }}>Kho voucher</h1>
              </div>
              <p className={styles.subtitle} style={{ marginLeft: '48px' }}>
                Áp dụng mã giảm giá khi thanh toán để nhận ưu đãi hấp dẫn cho các sản phẩm mỹ phẩm thuần chay.
              </p>
            </div>
            
            <div className={styles.addVoucherBox}>
              <div className={styles.inputWrapper}>
                <Search size={16} className={styles.inputIcon} />
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  placeholder="Tìm mã voucher..."
                  className={styles.voucherInput}
                />
              </div>
            </div>
          </div>

          <div className={styles.tabs} style={{ marginLeft: '48px' }}>
            {FILTERS.map((f) => {
              const isActive = filter === f.value;
              const count = counts[f.value] ?? 0;
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                >
                  {f.label} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        </header>

        {loading ? (
          <div className={styles.loaderContainer}>
            <Loader2 size={32} className={styles.spin} style={{ color: 'var(--color-primary)' }} />
            <span>Đang tải voucher...</span>
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} style={{ background: 'var(--color-bg-secondary)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
              <Ticket size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', margin: '0' }}>
              {searchCode ? 'Không tìm thấy voucher' : 'Chưa có voucher'}
            </h3>
            <p className={styles.emptyHint}>
              {searchCode
                ? `Không có voucher nào khớp với "${searchCode}". Hãy thử từ khóa khác.`
                : 'Hiện chưa có voucher nào khả dụng. Hãy quay lại sau, chúng tôi sẽ có ưu đãi mới cho bạn.'}
            </p>
          </div>
        ) : (
          <div className={styles.voucherGrid}>
            {filteredVouchers.map((v) => (
              <VoucherTicket
                key={v.id}
                voucher={v}
                copiedId={copiedId}
                onCopy={handleCopyCode}
                onUse={handleUseNow}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VoucherTicket({ voucher, copiedId, onCopy, onUse }: {
  voucher: Voucher;
  copiedId: string | null;
  onCopy: (code: string, id: string) => void;
  onUse: (code: string) => void;
}) {
  const isShipping = voucher.discount_type === 'shipping';
  const expired = voucher.end_date !== null && new Date(voucher.end_date) < new Date();
  const usable = !voucher.is_used && !expired;
  const TypeIcon = isShipping ? Truck : Percent;
  const isCopied = copiedId === voucher.id;

  const discountLabel = isShipping
    ? 'Miễn phí vận chuyển'
    : voucher.discount_type === 'percent'
    ? `Giảm ${voucher.discount_value}%`
    : `Giảm ${Number(voucher.discount_value).toLocaleString('vi-VN')}đ`;

  return (
    <article className={`${styles.voucherCard} ${!usable ? styles.cardUsed : ''}`}>
      <div className={`${styles.cardLeft} ${isShipping ? styles.typeShipping : styles.typeDiscount}`}>
        <div className={styles.typeIconBg}>
          <TypeIcon size={24} />
        </div>
        <span className={styles.typeLabel}>{isShipping ? 'VẬN CHUYỂN' : 'GIẢM GIÁ'}</span>
      </div>

      <div className={styles.decorCircles}>
        <div className={styles.circleTop} />
        <div className={styles.circleBottom} />
      </div>

      <div className={styles.cardRight}>
        <div className={styles.cardInfoTop}>
          <h3 className={styles.voucherTitle}>{voucher.title}</h3>
          <span className={styles.tagLimited} style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-100)', fontWeight: 700 }}>
            {discountLabel}
          </span>
        </div>
        
        {voucher.description && (
          <p className={styles.voucherDesc}>{voucher.description}</p>
        )}

        {voucher.min_order > 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
            Đơn tối thiểu: {Number(voucher.min_order).toLocaleString('vi-VN')}đ
          </p>
        )}

        <div className={styles.voucherFooter}>
          <div className={styles.expiryBox}>
            <Calendar size={14} />
            HSD: {voucher.end_date ? new Date(voucher.end_date).toLocaleDateString('vi-VN') : 'Không giới hạn'}
            {voucher.is_used && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--color-bg-secondary)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                <Tag size={10} /> Đã dùng
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className={styles.useBtn}
              style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
              onClick={() => onCopy(voucher.code, voucher.id)}
              title="Sao chép mã"
            >
              {isCopied ? <><CheckCircle2 size={12} /> Đã sao chép</> : <><Copy size={12} /> {voucher.code}</>}
            </button>
            <button
              className={styles.useBtn}
              disabled={!usable}
              onClick={() => onUse(voucher.code)}
            >
              {voucher.is_used ? 'Đã dùng' : 'Dùng ngay'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function VouchersPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16 text-text-muted">
          <Loader2 size={24} className="inline animate-spin mr-2" /> Đang chuẩn bị voucher...
        </div>
      }
    >
      <VouchersContent />
    </Suspense>
  );
}
