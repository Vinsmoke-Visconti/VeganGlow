'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SORT_OPTIONS } from '@/app/(storefront)/products/constants';
import styles from '@/app/(storefront)/products/products.module.css';

/**
 * SortSelect Component
 * Moved to components to ensure clean Client Component boundaries.
 */
export default function SortSelect({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'newest') {
      params.set('sort', value);
    } else {
      params.delete('sort');
    }
    router.push(`/products?${params.toString()}`);
  };

  return (
    <select
      name="sort"
      defaultValue={defaultValue}
      onChange={(e) => handleSortChange(e.target.value)}
      className={styles.sortSelect}
      aria-label="Sắp xếp sản phẩm"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          Sắp xếp: {opt.label}
        </option>
      ))}
    </select>
  );
}
