'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import shared from '../../admin-shared.module.css';
import { ORDER_STATUS_LABEL } from '@/lib/admin/format';
import type { OrderListFilters } from '@/lib/admin/queries/orders';

const STATUS_OPTIONS: (keyof typeof ORDER_STATUS_LABEL)[] = [
  'pending',
  'confirmed',
  'shipping',
  'completed',
  'cancelled',
];

export function OrdersFilters({ defaults }: { defaults: OrderListFilters }) {
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
    <div className={shared.toolbar}>
      <div className={shared.filterBar}>
        <div className={shared.searchInput}>
          <Search size={16} />
          <input
            placeholder="Tìm theo mã / tên / SĐT"
            defaultValue={defaults.q ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = (e.target as HTMLInputElement).value.trim();
                setParam('q', value || undefined);
              }
            }}
          />
        </div>
        <button
          type="button"
          className={`${shared.filterChip} ${!defaults.status ? shared.filterChipActive : ''}`}
          onClick={() => setParam('status', undefined)}
        >
          Tất cả
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`${shared.filterChip} ${defaults.status === s ? shared.filterChipActive : ''}`}
            onClick={() => setParam('status', s)}
          >
            {ORDER_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
