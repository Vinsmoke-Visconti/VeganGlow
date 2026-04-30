import { ScrollText, Search, Filter, ShieldCheck } from 'lucide-react';
import { listAuditEntries } from '@/lib/admin/queries/audit';
import { formatDate } from '@/lib/admin/format';
import shared from '../admin-shared.module.css';

export default async function AdminAuditLogs() {
  const auditEntries = await listAuditEntries({ limit: 150 });

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>
            <ScrollText size={20} /> Nhật ký hoạt động
          </h1>
        </div>
      </div>

      <div className={shared.toolbar}>
        <div className={shared.filterBar}>
          <div className={shared.searchInput}>
            <Search size={14} />
            <input type="text" placeholder="Tìm kiếm hành động, nhân sự..." />
          </div>
          <button className={shared.btnSecondary}>
            <Filter size={14} /> Lọc dữ liệu
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--vg-ink-500)' }}>
          Hiển thị <strong>{auditEntries.length}</strong> nhật ký mới nhất
        </p>
      </div>

      <div className={shared.tableWrap}>
        <table className={shared.table}>
          <thead>
            <tr>
              <th style={{ width: 160 }}>Thời gian</th>
              <th style={{ width: 200 }}>Nhân sự</th>
              <th style={{ width: 120 }}>Hành động</th>
              <th style={{ width: 150 }}>Đối tượng</th>
              <th>Chi tiết hoạt động</th>
              <th style={{ width: 120 }}>Địa chỉ IP</th>
            </tr>
          </thead>
          <tbody>
            {auditEntries.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0' }}>
                   <div style={{ opacity: 0.5 }}>Chưa có nhật ký hoạt động nào được ghi nhận.</div>
                </td>
              </tr>
            ) : (
              auditEntries.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontSize: 12, color: 'var(--vg-ink-600)' }}>
                    {formatDate(a.created_at)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ 
                        width: 24, height: 24, borderRadius: '50%', 
                        background: 'var(--vg-leaf-100)', color: 'var(--vg-leaf-700)',
                        display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800
                      }}>
                        {a.actor?.full_name?.charAt(0) || '?'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{a.actor?.full_name || 'Hệ thống'}</span>
                        <span style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {a.actor?.role?.display_name || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={shared.badge} style={{ 
                      background: a.action.includes('Delete') ? 'var(--vg-danger-bg)' : 'var(--vg-leaf-50)',
                      color: a.action.includes('Delete') ? 'var(--vg-danger-fg)' : 'var(--vg-leaf-700)',
                      border: '1px solid transparent'
                    }}>
                      {a.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>
                    {a.entity || a.resource_type}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--vg-ink-700)' }}>
                    {a.summary || '—'}
                  </td>
                  <td>
                    <code style={{ fontSize: 11, background: 'var(--vg-parchment-100)', padding: '2px 4px', borderRadius: 4 }}>
                      {a.ip_address || '0.0.0.0'}
                    </code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: 'var(--vg-parchment-50)', border: '1px solid var(--vg-parchment-200)', display: 'flex', gap: 12, alignItems: 'center' }}>
        <ShieldCheck size={20} style={{ color: 'var(--vg-leaf-600)' }} />
        <p style={{ margin: 0, fontSize: 13, color: 'var(--vg-ink-600)', lineHeight: 1.5 }}>
          <strong>Lưu ý về bảo mật:</strong> Nhật ký này được phân quyền dựa trên cấp bậc (Weights). Bạn chỉ có thể xem hoạt động của bản thân và các nhân sự có cấp bậc thấp hơn hoặc bằng mình. Mọi hành động chỉnh sửa nhật ký đều bị cấm để đảm bảo tính minh bạch.
        </p>
      </div>
    </div>
  );
}
