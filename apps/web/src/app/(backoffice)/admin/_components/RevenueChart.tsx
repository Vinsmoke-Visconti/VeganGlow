'use client';

import { formatNumber, formatVND } from '@/lib/admin/format';
import { useId } from 'react';
import type { TooltipProps } from 'recharts';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Point = { date: string; total: number; orders?: number };

type Props = {
  data: Point[];
  height?: number;
};

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(
    new Date(value),
  );
}

interface RevenueTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: Point;
    value: number;
  }>;
  label?: string | number;
}

function RevenueTooltip({ active, payload, label }: RevenueTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
 
  return (
    <div 
      className="rounded-lg border bg-white px-3 py-2 text-xs shadow-xl dark:bg-slate-900 dark:border-slate-800"
      style={{ 
        backgroundColor: 'var(--vg-surface-0)',
        border: '1px solid var(--vg-border)',
        boxShadow: 'var(--vg-shadow-3)'
      }}
    >
      <div className="font-bold" style={{ color: 'var(--vg-ink-900)' }}>{formatDay(String(label))}</div>
      <div className="mt-1 tabular-nums font-extrabold" style={{ color: 'var(--vg-leaf-600)', fontSize: '14px' }}>
        {formatVND(row?.total ?? 0)}
      </div>
      <div className="mt-0.5 font-medium" style={{ color: 'var(--vg-ink-500)' }}>
        {formatNumber(row?.orders ?? 0)} đơn hàng
      </div>
    </div>
  );
}

export function RevenueChart({ data, height = 260 }: Props) {
  const gradientId = useId().replace(/:/g, '');

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-zinc-200 text-sm text-zinc-400">
        Chưa có dữ liệu doanh thu
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--vg-leaf-500)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--vg-leaf-500)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--vg-border)" strokeDasharray="3 3" vertical={false} opacity={0.4} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
            tick={{ fill: 'var(--vg-ink-500)', fontSize: 11, fontWeight: 500 }}
          />
          <YAxis
            width={72}
            tickFormatter={(value) => formatNumber(Number(value))}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--vg-ink-500)', fontSize: 11, fontWeight: 500 }}
          />
          <Tooltip 
            content={<RevenueTooltip />} 
            cursor={{ stroke: 'var(--vg-leaf-500)', strokeWidth: 1, strokeDasharray: '4 4' }} 
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--vg-leaf-500)"
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            activeDot={{ 
              r: 5, 
              strokeWidth: 2, 
              stroke: 'var(--vg-leaf-500)', 
              fill: 'var(--vg-surface-0)' 
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
