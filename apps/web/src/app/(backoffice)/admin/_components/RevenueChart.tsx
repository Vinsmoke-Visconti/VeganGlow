'use client';

import { useMemo, useState } from 'react';
import { formatVND } from '@/lib/admin/format';

type Point = { date: string; total: number; orders?: number };

type Props = {
  data: Point[];
  height?: number;
};

const W = 1000;

export function RevenueChart({ data, height = 220 }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const { stepX, points, areaPath, max } = useMemo(() => {
    if (data.length === 0) {
      return { stepX: 0, points: '', areaPath: '', max: 0 };
    }
    const max = Math.max(...data.map((d) => d.total), 1);
    const stepX = W / Math.max(data.length - 1, 1);
    const pad = 8;
    const innerH = height - pad * 2;
    const ys = data.map((d) => height - pad - (d.total / max) * innerH);
    const points = data.map((d, i) => `${i * stepX},${ys[i]}`).join(' ');
    const areaPath = `M0,${height} L${points} L${(data.length - 1) * stepX},${height} Z`;
    return { stepX, points, areaPath, max };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-zinc-200 text-sm text-zinc-400">
        Chưa có dữ liệu doanh thu
      </div>
    );
  }

  const totalRevenue = data.reduce((s, d) => s + d.total, 0);
  const totalOrders = data.reduce((s, d) => s + (d.orders ?? 0), 0);
  const hovered = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <div className="mb-4 flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-zinc-500">
            {hovered ? new Date(hovered.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'Tổng'}
          </span>
          <span className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums">
            {formatVND(hovered ? hovered.total : totalRevenue)}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-xs">
          <span className="text-zinc-500">{hovered ? 'Đơn trong ngày' : 'Tổng đơn'}</span>
          <span className="font-medium tabular-nums text-zinc-700">
            {hovered ? hovered.orders ?? 0 : totalOrders}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        className="overflow-visible"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="vgChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={0}
            x2={W}
            y1={height * p}
            y2={height * p}
            stroke="rgb(244 244 245)"
            strokeWidth={1}
          />
        ))}

        <path d={areaPath} fill="url(#vgChartGrad)" />
        <polyline
          fill="none"
          stroke="rgb(16 185 129)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />

        {data.map((d, i) => {
          const x = i * stepX;
          const y = height - 8 - (d.total / max) * (height - 16);
          return (
            <g key={d.date}>
              <rect
                x={Math.max(0, x - stepX / 2)}
                y={0}
                width={stepX}
                height={height}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
              <circle
                cx={x}
                cy={y}
                r={hover === i ? 5 : 0}
                fill="white"
                stroke="rgb(16 185 129)"
                strokeWidth={2.5}
                className="transition-all"
              />
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-zinc-400">
        {data.map((d, i) => (
          <span key={d.date} className={i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 7) === 0 ? '' : 'opacity-0'}>
            {new Date(d.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
          </span>
        ))}
      </div>
    </div>
  );
}
