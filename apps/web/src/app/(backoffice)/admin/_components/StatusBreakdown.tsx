'use client';

import { ORDER_STATUS_LABEL } from '@/lib/admin/format';
import type { TooltipProps } from 'recharts';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Bucket = { status: string; total: number };

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#0ea5e9',
  packing: '#6366f1',
  shipped: '#4f46e5',
  shipping: '#4f46e5',
  delivered: '#10b981',
  completed: '#10b981',
  cancelled: '#d4d4d8',
};

interface StatusTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: Bucket;
    value: number;
  }>;
  label?: string | number;
}

function StatusTooltip({ active, payload, label }: StatusTooltipProps) {
  if (!active || !payload?.length) return null;
  const total = payload[0]?.value ?? 0;
 
  return (
    <div 
      className="rounded-lg border px-3 py-2 text-xs shadow-xl"
      style={{ 
        backgroundColor: 'var(--vg-surface-0)',
        border: '1px solid var(--vg-border)',
        boxShadow: 'var(--vg-shadow-3)'
      }}
    >
      <div className="font-bold" style={{ color: 'var(--vg-ink-900)' }}>{ORDER_STATUS_LABEL[String(label)] ?? label}</div>
      <div className="mt-1 tabular-nums font-medium" style={{ color: 'var(--vg-ink-700)' }}>{total} đơn hàng</div>
    </div>
  );
}

export function StatusBreakdown({ data }: { data: Bucket[] }) {
  const total = data.reduce((s, b) => s + b.total, 0);

  if (total === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-zinc-200 text-sm text-zinc-400">
        Chưa có đơn 30 ngày qua
      </div>
    );
  }

  const chartData = data.map((bucket) => ({
    ...bucket,
    label: ORDER_STATUS_LABEL[bucket.status] ?? bucket.status,
    percent: total > 0 ? Math.round((bucket.total / total) * 100) : 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div style={{ width: '100%', height: 190, minHeight: 190, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={190} debounce={100}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 12, bottom: 4 }}>
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis
              type="category"
              dataKey="status"
              width={82}
              tickFormatter={(value) => ORDER_STATUS_LABEL[String(value)] ?? String(value)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--vg-ink-500)', fontSize: 12, fontWeight: 500 }}
            />
            <Tooltip content={<StatusTooltip />} cursor={{ fill: 'var(--vg-surface-100)', opacity: 0.5 }} />
            <Bar dataKey="total" radius={[0, 999, 999, 0]} barSize={10}>
              {chartData.map((bucket) => (
                <Cell key={bucket.status} fill={STATUS_COLOR[bucket.status] ?? '#71717a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-col gap-2">
        {chartData.map((bucket) => (
          <li key={bucket.status} className="flex items-center justify-between text-sm">
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: STATUS_COLOR[bucket.status] ?? 'var(--vg-ink-400)' }}
              />
              <span className="truncate" style={{ color: 'var(--vg-ink-700)' }}>{bucket.label}</span>
            </span>
            <span className="flex items-baseline gap-1.5 tabular-nums">
              <span className="font-bold" style={{ color: 'var(--vg-ink-900)' }}>{bucket.total}</span>
              <span className="text-xs" style={{ color: 'var(--vg-ink-400)' }}>{bucket.percent}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
