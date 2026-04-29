'use client';

import { useRouter, usePathname } from 'next/navigation';
import shared from '../admin-shared.module.css';
import type { DashboardRange } from '@/lib/admin/queries/dashboard';

const OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
];

export function RangeSwitch({ current }: { current: DashboardRange }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className={shared.filterBar} role="tablist" aria-label="Khoảng thời gian">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === current}
          className={`${shared.filterChip} ${opt.value === current ? shared.filterChipActive : ''}`}
          onClick={() => router.push(`${pathname}?range=${opt.value}`)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
