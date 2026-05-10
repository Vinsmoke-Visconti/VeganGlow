'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { RotateCcw, Search } from 'lucide-react';
import shared from '../../admin-shared.module.css';

const CATEGORY_OPTIONS = [
  { value: 'Làm đẹp', label: 'Làm đẹp' },
  { value: 'Sức khỏe', label: 'Sức khỏe' },
  { value: 'Hướng dẫn', label: 'Hướng dẫn' },
  { value: 'Tin tức', label: 'Tin tức' },
];

const STATUS_OPTIONS = [
  { value: 'published', label: 'Đã xuất bản' },
  { value: 'draft', label: 'Bản nháp' },
];

export function BlogFilters({ defaults }: { defaults: { q?: string; category?: string; status?: string } }) {
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
          placeholder="Tìm bài viết theo tiêu đề..."
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
        <option value="">Tất cả chuyên mục</option>
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
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

      <Link href="/admin/blogs" className={`${shared.btn} ${shared.btnGhost}`} style={{ height: 32, padding: '0 8px' }}>
        <RotateCcw size={12} />
      </Link>
    </div>
  );
}
