'use client';

import { formatVND } from '@/lib/admin/format';

type Point = { date: string; total: number };

export function Sparkline({ data }: { data: Point[] }) {
  const gradientId = `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`;
  if (data.length === 0) {
    return <div style={{ color: 'var(--vg-ink-400)', fontSize: 'var(--vg-text-sm)' }}>Chưa có dữ liệu</div>;
  }
  const max = Math.max(...data.map((d) => d.total), 1);
  const w = 600;
  const h = 120;
  const stepX = w / Math.max(data.length - 1, 1);
  const points = data
    .map((d, i) => `${i * stepX},${h - (d.total / max) * (h - 24) - 12}`)
    .join(' ');
  const areaPoints = `0,${h} ${points} ${(data.length - 1) * stepX},${h}`;
 
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      role="img"
      aria-label="Biểu đồ doanh thu"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--vg-leaf-500)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="var(--vg-leaf-500)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gradientId})`} points={areaPoints} />
      <polyline 
        fill="none" 
        stroke="var(--vg-leaf-500)" 
        strokeWidth={3} 
        points={points} 
        strokeLinejoin="round" 
        strokeLinecap="round" 
        style={{ filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.2))' }}
      />
      {data.map((d, i) => (
        <g key={d.date} className="sparkline-dot">
          <circle 
            cx={i * stepX} 
            cy={h - (d.total / max) * (h - 24) - 12} 
            r={4} 
            fill="var(--vg-surface-0)" 
            stroke="var(--vg-leaf-500)"
            strokeWidth={2}
          />
          <title>{`${d.date}: ${formatVND(d.total)}`}</title>
        </g>
      ))}
    </svg>
  );
}
