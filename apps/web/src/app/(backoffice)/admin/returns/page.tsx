import { listAllReturns } from '@/lib/admin/queries/returns';
import { formatVND, formatDate } from '@/lib/admin/format';
import shared from '../admin-shared.module.css';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';

export const metadata = { title: 'Yêu cầu hoàn / đổi trả - Admin' };

const STATUS_LABEL: Record<string, string> = {
  requested: 'Mới yêu cầu',
  approved: 'Đã duyệt',
  received: 'Đã nhận hàng',
  refunded: 'Đã hoàn tiền',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
};

const STATUS_BADGE: Record<string, string> = {
  requested: 'badgeWarning',
  approved: 'badgeInfo',
  received: 'badgeInfo',
  refunded: 'badgeSuccess',
  rejected: 'badgeDanger',
  cancelled: 'badgeMuted',
};

type Props = { searchParams: Promise<{ status?: string }> };

export default async function ReturnsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const returns = await listAllReturns({ status: sp.status, limit: 100 });

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Yêu cầu hoàn / đổi trả</h1>
          <p className={shared.pageSubtitle}>Quản lý RMA — duyệt, nhận hàng, hoàn tiền.</p>
        </div>
      </div>

      <div className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Tất cả yêu cầu ({returns.length})</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.keys(STATUS_LABEL).map((s) => (
              <Link
                key={s}
                href={s === sp.status ? '/admin/returns' : `/admin/returns?status=${s}`}
                className={`${shared.badge} ${shared[STATUS_BADGE[s]]}`}
                style={{
                  cursor: 'pointer',
                  opacity: sp.status && sp.status !== s ? 0.4 : 1,
                  textDecoration: 'none',
                }}
              >
                {STATUS_LABEL[s]}
              </Link>
            ))}
          </div>
        </div>

        {returns.length === 0 ? (
          <div className={shared.emptyState}>
            <div className={shared.emptyIcon}>
              <RotateCcw size={24} />
            </div>
            <p className={shared.emptyTitle}>Chưa có yêu cầu nào</p>
          </div>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>RMA Code</th>
                  <th>Đơn hàng</th>
                  <th>Lý do</th>
                  <th>Hoàn tiền</th>
                  <th>Trạng thái</th>
                  <th>Yêu cầu lúc</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.rma_code}</strong>
                    </td>
                    <td>
                      <Link href={`/admin/orders/${r.order_id}`}>Xem đơn</Link>
                    </td>
                    <td>{r.reason}</td>
                    <td>{r.refund_amount ? formatVND(r.refund_amount) : '—'}</td>
                    <td>
                      <span
                        className={`${shared.badge} ${shared[STATUS_BADGE[r.status] ?? 'badgeMuted']}`}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td>{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
