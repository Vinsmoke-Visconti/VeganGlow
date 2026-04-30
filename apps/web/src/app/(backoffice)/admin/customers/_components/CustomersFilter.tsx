'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import shared from '../../admin-shared.module.css';

export function CustomersFilter({ defaultQ }: { defaultQ?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(value: string | undefined) {
    const next = new URLSearchParams(sp.toString());
    if (!value) next.delete('q');
    else next.set('q', value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className={shared.filterBar}>
      <div className={shared.searchInput}>
        <Search size={16} />
        <input
          placeholder="Tìm khách hàng theo tên"
          defaultValue={defaultQ ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = (e.target as HTMLInputElement).value.trim();
              setParam(value || undefined);
            }
          }}
        />
      </div>
    </div>
  );
}
