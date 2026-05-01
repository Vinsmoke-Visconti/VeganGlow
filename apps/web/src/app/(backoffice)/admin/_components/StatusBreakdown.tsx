import { ORDER_STATUS_LABEL } from '@/lib/admin/format';

type Bucket = { status: string; total: number };

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-sky-500',
  shipping: 'bg-indigo-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-zinc-300',
};

export function StatusBreakdown({ data }: { data: Bucket[] }) {
  const total = data.reduce((s, b) => s + b.total, 0);

  if (total === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-zinc-200 text-sm text-zinc-400">
        Chưa có đơn 30 ngày qua
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        {data.map((b) => {
          const pct = (b.total / total) * 100;
          const color = STATUS_COLOR[b.status] ?? 'bg-zinc-400';
          return (
            <div
              key={b.status}
              className={`h-full ${color}`}
              style={{ width: `${pct}%` }}
              title={`${ORDER_STATUS_LABEL[b.status] ?? b.status}: ${b.total}`}
            />
          );
        })}
      </div>

      <ul className="flex flex-col gap-2.5">
        {data.map((b) => {
          const pct = total > 0 ? (b.total / total) * 100 : 0;
          const color = STATUS_COLOR[b.status] ?? 'bg-zinc-400';
          return (
            <li key={b.status} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${color}`} />
                <span className="text-zinc-700">
                  {ORDER_STATUS_LABEL[b.status] ?? b.status}
                </span>
              </span>
              <span className="flex items-baseline gap-1.5 tabular-nums">
                <span className="font-medium text-zinc-900">{b.total}</span>
                <span className="text-xs text-zinc-400">{pct.toFixed(0)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
