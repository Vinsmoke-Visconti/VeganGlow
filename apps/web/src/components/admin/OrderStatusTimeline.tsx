import { formatDate } from '@/lib/admin/format';
import type { OrderStatusHistoryRow } from '@/lib/admin/queries/returns';
import { CheckCircle2, Clock } from 'lucide-react';

const LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

export function OrderStatusTimeline({ rows }: { rows: OrderStatusHistoryRow[] }) {
  if (rows.length === 0) {
    return <p style={{ color: '#888', fontSize: 13 }}>Chưa có thay đổi trạng thái nào.</p>;
  }
  return (
    <ul
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        borderLeft: '2px solid #e8e8e8',
        paddingLeft: 16,
      }}
    >
      {rows.map((r, i) => (
        <li key={r.id} style={{ position: 'relative', marginBottom: 16, fontSize: 13 }}>
          <span
            style={{
              position: 'absolute',
              left: -25,
              top: 2,
              background: '#fff',
              color: i === rows.length - 1 ? '#1a7f37' : '#666',
            }}
          >
            {i === rows.length - 1 ? <CheckCircle2 size={16} /> : <Clock size={16} />}
          </span>
          <div>
            <strong>{LABEL[r.to_status] ?? r.to_status}</strong>
            {r.from_status && <span style={{ color: '#666' }}> ← {LABEL[r.from_status] ?? r.from_status}</span>}
          </div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
            {formatDate(r.created_at)}
            {r.changed_by ? ` · bởi ${r.changed_by.slice(0, 8)}` : ' · hệ thống'}
            {r.reason ? ` · ${r.reason}` : ''}
          </div>
        </li>
      ))}
    </ul>
  );
}
