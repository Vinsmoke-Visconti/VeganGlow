'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SORT_OPTIONS } from '@/app/(storefront)/products/constants';

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
      className="h-11 px-4 pr-8 rounded-full border border-border bg-white text-sm focus:border-text focus:outline-none appearance-none cursor-pointer"
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
