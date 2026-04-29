'use client';

import { formatVND } from '@/lib/admin/format';

type Point = { date: string; total: number };

export function Sparkline({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <div style={{ color: 'var(--vg-ink-500)', fontSize: 'var(--vg-text-sm)' }}>Chưa có dữ liệu</div>;
  }
  const max = Math.max(...data.map((d) => d.total), 1);
  const w = 600;
  const h = 120;
  const stepX = w / Math.max(data.length - 1, 1);
  const points = data
    .map((d, i) => `${i * stepX},${h - (d.total / max) * (h - 16) - 4}`)
    .join(' ');
  const areaPoints = `0,${h} ${points} ${(data.length - 1) * stepX},${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      role="img"
      aria-label="Biểu đồ doanh thu 7 ngày"
    >
      <polygon fill="var(--vg-leaf-100)" opacity="0.5" points={areaPoints} />
      <polyline fill="none" stroke="var(--vg-leaf-700)" strokeWidth={2} points={points} />
      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={i * stepX} cy={h - (d.total / max) * (h - 16) - 4} r={3} fill="var(--vg-leaf-700)" />
          <title>{`${d.date}: ${formatVND(d.total)}`}</title>
        </g>
      ))}
    </svg>
  );
}
