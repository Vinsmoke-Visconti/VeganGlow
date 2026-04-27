'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import styles from './products.module.css';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá: Thấp → Cao' },
  { value: 'price-desc', label: 'Giá: Cao → Thấp' },
  { value: 'rating', label: 'Đánh giá tốt nhất' },
  { value: 'popular', label: 'Bán chạy' },
];

export function SortSelect({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const onChange = (value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== 'newest') next.set('sort', value);
    else next.delete('sort');
    router.push(`/products${next.toString() ? `?${next}` : ''}`);
  };

  return (
    <select
      defaultValue={defaultValue}
      onChange={(e) => onChange(e.target.value)}
      className={styles.sortSelect}
      aria-label="Sắp xếp"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          Sắp xếp · {opt.label}
        </option>
      ))}
    </select>
  );
}
