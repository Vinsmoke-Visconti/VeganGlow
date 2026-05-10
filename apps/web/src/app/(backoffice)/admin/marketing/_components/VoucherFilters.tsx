'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { RotateCcw, Search } from 'lucide-react';
import shared from '../../admin-shared.module.css';

type VoucherStatus = 'active' | 'scheduled' | 'expired' | 'draft';

const STATUS_OPTIONS: { value: VoucherStatus; label: string }[] = [
  { value: 'active', label: 'Đang chạy' },
  { value: 'scheduled', label: 'Đã lên lịch' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'draft', label: 'Nháp' },
];

export function VoucherFilters({ defaults }: { defaults: { q?: string; status?: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(sp.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className={shared.filterBar}>
      <div className={shared.searchInput} style={{ flex: '0 1 240px' }}>
        <Search size={14} style={{ left: 10 }} />
        <input
          placeholder="Tìm voucher theo mã, tiêu đề..."
          defaultValue={defaults.q ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = (e.target as HTMLInputElement).value.trim();
              setParam('q', value || undefined);
            }
          }}
        />
      </div>

      <select
        className={shared.formSelect}
        value={defaults.status ?? ''}
        onChange={(e) => setParam('status', e.target.value || undefined)}
      >
        <option value="">Tất cả trạng thái</option>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <Link href="/admin/marketing?tab=vouchers" className={`${shared.btn} ${shared.btnGhost}`} style={{ height: 32, padding: '0 8px' }}>
        <RotateCcw size={12} />
      </Link>
    </div>
  );
}
