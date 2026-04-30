'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RotateCcw, Search } from 'lucide-react';
import shared from '../../admin-shared.module.css';
import type {
  ProductListFilters,
  ProductStatusFilter,
  ProductStockFilter,
} from '@/lib/admin/queries/products';

type Category = { id: string; name: string };

const STOCK_OPTIONS: { value: ProductStockFilter; label: string }[] = [
  { value: 'in', label: 'Còn hàng' },
  { value: 'low', label: 'Sắp hết' },
  { value: 'out', label: 'Hết hàng' },
];

const STATUS_OPTIONS: { value: ProductStatusFilter; label: string }[] = [
  { value: 'active', label: 'Đang hiển thị' },
  { value: 'inactive', label: 'Đang ẩn' },
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
    <div className={shared.filterBar}>
      <div className={shared.searchInput} style={{ flex: '0 1 240px' }}>
        <Search size={14} style={{ left: 10 }} />
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

      <button
        type="button"
        className={`${shared.filterChip} ${!defaults.stock ? shared.filterChipActive : ''}`}
        onClick={() => setParam('stock', undefined)}
      >
        Tất cả tồn kho
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

      <Link href="/admin/products" className={`${shared.btn} ${shared.btnGhost}`} style={{ height: 32, padding: '0 8px' }}>
        <RotateCcw size={12} />
      </Link>
    </div>
  );
}
