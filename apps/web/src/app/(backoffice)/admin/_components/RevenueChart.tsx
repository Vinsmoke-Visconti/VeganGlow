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
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-zinc-900">{formatDay(String(label))}</div>
      <div className="mt-1 tabular-nums text-emerald-700">{formatVND(row?.total ?? 0)}</div>
      <div className="mt-0.5 text-zinc-500">{formatNumber(row?.orders ?? 0)} đơn hàng</div>
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
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f4f4f5" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
            tick={{ fill: '#71717a', fontSize: 11 }}
          />
          <YAxis
            width={72}
            tickFormatter={(value) => formatNumber(Number(value))}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#71717a', fontSize: 11 }}
          />
          <Tooltip content={<RevenueTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#10b981"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#10b981', fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
