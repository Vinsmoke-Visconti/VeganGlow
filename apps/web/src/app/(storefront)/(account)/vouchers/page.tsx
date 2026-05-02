'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import styles from './vouchers.module.css';

interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: string;
  end_date: string | null;
  is_used?: boolean;
}

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'shipping', label: 'Vận chuyển' },
  { value: 'discount', label: 'Giảm giá' },
] as const;

function VouchersContent() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const supabase = createBrowserClient();

  const fetchVouchers = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_vouchers')
      .select(
        `
        is_used,
        vouchers (
          id,
          code,
          title,
          description,
          discount_type,
          end_date
        )
      `,
      )
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching vouchers:', error);
    } else if (data) {
      type UserVoucherJoin = {
        is_used: boolean;
        vouchers: {
          id: string;
          code: string;
          title: string;
          description: string | null;
          discount_type: string;
          end_date: string | null;
        } | null;
      };
      const rows = data as unknown as UserVoucherJoin[];
      const flattened = rows
        .filter((r) => r.vouchers)
        .map((r) => ({
          ...(r.vouchers as NonNullable<UserVoucherJoin['vouchers']>),
          is_used: r.is_used,
        }));
      setVouchers(flattened);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: vouchers.length, shipping: 0, discount: 0 };
    for (const v of vouchers) {
      if (v.discount_type === 'shipping') map.shipping++;
      else if (v.discount_type === 'percentage' || v.discount_type === 'fixed') map.discount++;
    }
    return map;
  }, [vouchers]);

  const filteredVouchers = vouchers.filter((v) => {
    if (filter === 'all') return true;
    if (filter === 'shipping') return v.discount_type === 'shipping';
    if (filter === 'discount') return v.discount_type === 'percentage' || v.discount_type === 'fixed';
    return true;
  });

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
                Sử dụng voucher để được giảm giá khi thanh toán cho các sản phẩm mỹ phẩm thuần chay yêu thích.
              </p>
            </div>
            
            <div className={styles.addVoucherBox}>
              <div className={styles.inputWrapper}>
                <Search size={16} className={styles.inputIcon} />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã voucher tại đây..."
                  className={styles.voucherInput}
                />
              </div>
              <button className={styles.applyBtn} disabled={!code.trim()} style={{ opacity: !code.trim() ? 0.5 : 1 }}>Lưu mã</button>
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', margin: '0' }}>Chưa có voucher</h3>
            <p className={styles.emptyHint}>
              Bạn chưa có voucher nào trong danh mục này. Hãy quay lại sau, chúng tôi sẽ có ưu đãi mới cho bạn.
            </p>
          </div>
        ) : (
          <div className={styles.voucherGrid}>
            {filteredVouchers.map((v) => (
              <VoucherTicket key={v.id} voucher={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VoucherTicket({ voucher }: { voucher: Voucher }) {
  const isShipping = voucher.discount_type === 'shipping';
  const expired = voucher.end_date !== null && new Date(voucher.end_date) < new Date();
  const usable = !voucher.is_used && !expired;
  const TypeIcon = isShipping ? Truck : Percent;

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
          <span className={styles.tagLimited} style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-light)' }}>
            {voucher.code}
          </span>
        </div>
        
        {voucher.description && (
          <p className={styles.voucherDesc}>{voucher.description}</p>
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
            {expired && !voucher.is_used && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: '#991b1b' }}>
                <Clock size={10} /> Hết hạn
              </span>
            )}
          </div>
          <button className={styles.useBtn} disabled={!usable}>
            {voucher.is_used ? 'Đã dùng' : 'Dùng ngay'}
          </button>
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
