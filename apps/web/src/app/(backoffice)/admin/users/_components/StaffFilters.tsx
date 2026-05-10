'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { RotateCcw, Search } from 'lucide-react';
import shared from '../../admin-shared.module.css';

export function StaffFilters({ defaultValue }: { defaultValue?: string }) {
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
          placeholder="Tìm nhân sự, email..."
          defaultValue={defaultValue ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = (e.target as HTMLInputElement).value.trim();
              setParam('q', value || undefined);
            }
          }}
        />
      </div>

      <Link href="/admin/users" className={`${shared.btn} ${shared.btnGhost}`} style={{ height: 32, padding: '0 8px' }}>
        <RotateCcw size={12} />
      </Link>
    </div>
  );
}
