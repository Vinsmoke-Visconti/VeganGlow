'use client';

import { formatVND } from '@/lib/admin/format';

type Slice = { category: string; revenue: number };

type Props = {
  data: Slice[];
  size?: number;
};

const COLORS = [
  '#1a7f37',
  '#5acd6e',
  '#5db8ff',
  '#9b6bff',
  '#ff8a4a',
  '#ffce4a',
  '#ff6b6b',
  '#37ddc3',
];

export function PieChart({ data, size = 200 }: Props) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  if (total === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--vg-ink-400)', fontSize: '13px' }}>
        Chưa có doanh thu để hiển thị
      </div>
    );
  }

  const radius = size / 2;
  const cx = radius;
  const cy = radius;
  let startAngle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const fraction = d.revenue / total;
    const endAngle = startAngle + fraction * Math.PI * 2;
    const largeArc = fraction > 0.5 ? 1 : 0;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const path = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    const result = {
      path,
      color: COLORS[i % COLORS.length],
      label: d.category,
      value: d.revenue,
      pct: fraction * 100,
    };
    startAngle = endAngle;
    return result;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: 'drop-shadow(var(--vg-shadow-1))' }}>
        {slices.map((s, i) => (
          <path 
            key={i} 
            d={s.path} 
            fill={s.color} 
            stroke="var(--vg-surface-0)" 
            strokeWidth={1.5} 
            style={{ transition: 'all 0.3s' }}
          />
        ))}
      </svg>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: 'var(--vg-ink-700)' }}>
        {slices.map((s, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                background: s.color,
                borderRadius: 3,
                boxShadow: '0 0 4px rgba(0,0,0,0.1)'
              }}
            />
            <span style={{ minWidth: 100, fontWeight: 500 }}>{s.label}</span>
            <strong style={{ color: 'var(--vg-ink-900)' }}>{formatVND(s.value)}</strong>
            <span style={{ color: 'var(--vg-ink-400)', fontSize: '11px', marginLeft: 'auto' }}>
              {s.pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
