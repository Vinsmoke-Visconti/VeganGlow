'use client';

import { useState, useEffect, Suspense } from 'react';
import { Ticket, Clock, Tag, Loader2, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';

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

  const filteredVouchers = vouchers.filter((v) => {
    if (filter === 'all') return true;
    if (filter === 'shipping') return v.discount_type === 'shipping';
    if (filter === 'discount') return v.discount_type === 'percentage' || v.discount_type === 'fixed';
    return true;
  });

  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-6"
      >
        <ArrowLeft size={14} /> Quay lại hồ sơ
      </Link>

      <header className="mb-10">
        <span className="text-xs uppercase tracking-[0.2em] text-primary">Ưu đãi của bạn</span>
        <h1 className="font-serif text-3xl lg:text-4xl font-medium tracking-tight text-text mt-1">
          Kho voucher
        </h1>
        <p className="mt-2 text-text-secondary text-sm">
          Sử dụng voucher để được giảm giá khi thanh toán.
        </p>
      </header>

      {/* Code input */}
      <div className="rounded-2xl bg-bg-card border border-border-light p-4 lg:p-5 mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã voucher tại đây"
              className="w-full h-11 pl-11 pr-4 rounded-full border border-border bg-white text-sm uppercase tracking-wide focus:border-text focus:outline-none"
            />
          </div>
          <button
            type="button"
            className="h-11 px-6 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition disabled:opacity-50"
            disabled={!code.trim()}
          >
            Lưu mã
          </button>
        </div>
      </div>

      {/* Tabs */}
      <nav
        role="tablist"
        aria-label="Lọc loại voucher"
        className="flex gap-2 overflow-x-auto pb-3 mb-6 border-b border-border-light"
      >
        {FILTERS.map((f) => {
          const isActive = filter === f.value;
          return (
            <button
              key={f.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 -mb-px px-4 py-2.5 text-sm font-medium tracking-tight border-b-2 transition ${
                isActive
                  ? 'border-text text-text'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </nav>

      {loading ? (
        <div className="text-center py-16 text-text-muted">
          <Loader2 size={24} className="inline animate-spin mr-2" /> Đang tải voucher...
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="text-center py-16 lg:py-24 rounded-2xl bg-bg-card border border-border-light">
          <div className="inline-grid place-items-center w-20 h-20 rounded-full bg-primary-50 text-primary mb-4">
            <Ticket size={32} />
          </div>
          <h3 className="font-serif text-xl font-medium text-text mb-2">Chưa có voucher</h3>
          <p className="text-text-secondary text-sm">
            Bạn chưa có voucher nào trong danh mục này.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {filteredVouchers.map((v) => (
            <VoucherTicket key={v.id} voucher={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function VoucherTicket({ voucher }: { voucher: Voucher }) {
  const isShipping = voucher.discount_type === 'shipping';
  const expired =
    voucher.end_date !== null && new Date(voucher.end_date) < new Date();
  const usable = !voucher.is_used && !expired;
  const Icon = isShipping ? Clock : Tag;

  const accentBg = isShipping ? 'bg-primary' : 'bg-text';
  const accentText = isShipping ? 'text-primary' : 'text-text';

  return (
    <article className="relative flex rounded-2xl overflow-hidden bg-bg-card border border-border-light shadow-sm">
      {/* Left punch */}
      <div className={`relative ${accentBg} text-white w-28 lg:w-32 shrink-0 flex flex-col items-center justify-center gap-2 px-3 py-6`}>
        <Icon size={28} />
        <span className="text-[11px] uppercase tracking-[0.18em] font-medium text-center">
          {isShipping ? 'Vận chuyển' : 'Giảm giá'}
        </span>
      </div>

      {/* Perforation */}
      <div className="relative w-px bg-transparent">
        {/* dashed line */}
        <div className="absolute inset-y-3 left-0 w-px border-l border-dashed border-border" />
        {/* top notch */}
        <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-bg" />
        {/* bottom notch */}
        <div className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-bg" />
      </div>

      {/* Right content */}
      <div className="flex-1 p-5 flex flex-col gap-3">
        <div>
          <h3 className="font-serif text-lg font-medium text-text leading-snug line-clamp-2">
            {voucher.title}
          </h3>
          {voucher.description && (
            <p className="text-xs text-text-muted mt-1 line-clamp-2">{voucher.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs px-2 py-1 rounded bg-bg-secondary ${accentText}`}>
            {voucher.code}
          </span>
          {voucher.is_used && (
            <span className="text-[10px] uppercase tracking-wide text-text-muted">Đã dùng</span>
          )}
          {expired && !voucher.is_used && (
            <span className="text-[10px] uppercase tracking-wide text-error">Hết hạn</span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-border-light">
          <span className="text-xs text-text-muted">
            HSD:{' '}
            {voucher.end_date
              ? new Date(voucher.end_date).toLocaleDateString('vi-VN')
              : 'Không giới hạn'}
          </span>
          <button
            type="button"
            disabled={!usable}
            className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-text text-white text-xs font-medium hover:bg-primary-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {voucher.is_used ? 'Đã dùng' : 'Dùng ngay'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function VouchersPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-text-muted">Đang chuẩn bị voucher...</div>}>
      <VouchersContent />
    </Suspense>
  );
}
