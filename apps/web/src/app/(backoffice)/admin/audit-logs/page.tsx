import { formatDate } from '@/lib/admin/format';
import { listAuditEntries, listMyAuditEntries } from '@/lib/admin/queries/audit';
import { ScrollText } from 'lucide-react';
import shared from '../admin-shared.module.css';
import { createClient } from '@/lib/supabase/server';
import { decodeAccessToken, isSuperAdmin, hasPermission } from '@/lib/security/jwtClaims';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Nhật ký hệ thống - Admin',
};

export default async function AdminAuditLogs({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Permission gate: super_admin or audit:read sees all; other staff sees only their own.
  // Customers and unauthenticated users get 404 (defense-in-depth).
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const claims = decodeAccessToken(session?.access_token ?? null);
  const canSeeAll = isSuperAdmin(claims) || hasPermission(claims, 'audit:read');
  const role = claims?.app_metadata?.staff_role;
  if (!role || role === 'customer') {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined;

  const auditEntries = canSeeAll
    ? await listAuditEntries({ limit: 100, search: q })
    : await listMyAuditEntries(100);

  return (
    <div className={shared.page}>


      <div className={shared.card}>
        <div className={shared.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className={shared.cardTitle}>Tất cả nhật ký</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <form method="GET" action="/admin/audit-logs" style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="search" 
                name="q" 
                placeholder="Tìm hành động, mô tả..." 
                defaultValue={q}
                className={shared.input} 
                style={{ height: '32px', fontSize: '13px', width: '200px' }}
              />
              <button type="submit" className={shared.btnSecondary} style={{ height: '32px', fontSize: '13px' }}>
                Tìm
              </button>
            </form>
            <a 
              href="/admin/audit-logs" 
              className={shared.btnSecondary}
              style={{ fontSize: 13, height: '32px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Tải lại
            </a>
            <a 
              href="/api/admin/export/logs?days=30" 
              className={shared.btnSecondary}
              style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Xuất file CSV (30 ngày)
            </a>
          </div>
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
