import { formatDate } from '@/lib/admin/format';
import { listAuditEntries } from '@/lib/admin/queries/audit';
import { ScrollText, Activity } from 'lucide-react';
import shared from '../admin-shared.module.css';

export const metadata = {
  title: 'Nhật ký hệ thống - Admin',
};

export default async function AdminAuditLogs() {
  const auditEntries = await listAuditEntries({ limit: 100 });

  return (
    <div className={shared.page}>


      <div className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Tất cả nhật ký</h2>
        </div>
        {auditEntries.length === 0 ? (
          <div className={shared.emptyState}>
            <div className={shared.emptyIcon}>
              <ScrollText size={24} />
            </div>
            <p className={shared.emptyTitle}>Chưa có nhật ký nào</p>
          </div>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Lúc</th>
                  <th>Hành động</th>
                  <th>Đối tượng</th>
                  <th>Mô tả</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDate(a.created_at)}</td>
                    <td>
                      <span className={`${shared.badge} ${shared.badgeInfo}`}>
                        {a.action}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong>{a.entity ?? a.resource_type}</strong>
                        {a.entity_id && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--vg-ink-500)' }}>{a.entity_id.slice(0, 8)}</span>}
                      </div>
                    </td>
                    <td>{a.summary ?? '—'}</td>
                    <td>
                      <code style={{ fontSize: 11, color: 'var(--vg-ink-500)' }}>
                        {a.ip_address ?? '—'}
                      </code>
                    </td>
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
