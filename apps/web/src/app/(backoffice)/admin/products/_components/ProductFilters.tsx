'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import shared from '../../admin-shared.module.css';
import type { ProductListFilters, ProductStockFilter } from '@/lib/admin/queries/products';

type Category = { id: string; name: string };

const STOCK_OPTIONS: { value: ProductStockFilter; label: string }[] = [
  { value: 'in', label: 'Còn hàng' },
  { value: 'low', label: 'Sắp hết' },
  { value: 'out', label: 'Hết hàng' },
];

export function ProductFilters({
  defaults,
  categories,
}: {
  defaults: ProductListFilters;
  categories: Category[];
}) {
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
            placeholder="Tìm sản phẩm theo tên"
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
          value={defaults.category ?? ''}
          onChange={(e) => setParam('category', e.target.value || undefined)}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`${shared.filterChip} ${!defaults.stock ? shared.filterChipActive : ''}`}
          onClick={() => setParam('stock', undefined)}
        >
          Tất cả
        </button>
        {STOCK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${shared.filterChip} ${defaults.stock === opt.value ? shared.filterChipActive : ''}`}
            onClick={() => setParam('stock', opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
