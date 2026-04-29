import Link from 'next/link';
import { ScrollText } from 'lucide-react';
import { getBrandInfo } from '@/lib/admin/queries/settings';
import { listAuditEntries } from '@/lib/admin/queries/audit';
import { formatDate } from '@/lib/admin/format';
import shared from '../admin-shared.module.css';
import { BrandTab } from './_components/BrandTab';

type Tab = 'brand' | 'audit';
type Props = { searchParams: Promise<{ tab?: Tab }> };

export default async function AdminSettings({ searchParams }: Props) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === 'audit' ? 'audit' : 'brand';

  const [brand, auditEntries] = await Promise.all([
    getBrandInfo(),
    tab === 'audit' ? listAuditEntries({ limit: 100 }) : Promise.resolve([]),
  ]);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Cài đặt</h1>
          <p className={shared.pageSubtitle}>Cấu hình hệ thống và xem nhật ký hoạt động</p>
        </div>
      </div>

      <div className={shared.tabBar}>
        <Link
          href="?tab=brand"
          className={`${shared.tabBtn} ${tab === 'brand' ? shared.tabBtnActive : ''}`}
        >
          Thông tin thương hiệu
        </Link>
        <Link
          href="?tab=audit"
          className={`${shared.tabBtn} ${tab === 'audit' ? shared.tabBtnActive : ''}`}
        >
          Nhật ký
        </Link>
      </div>

      {tab === 'brand' && <BrandTab initial={brand} />}

      {tab === 'audit' && (
        <>
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
                        <strong>{a.action}</strong>
                      </td>
                      <td>
                        {a.entity ?? a.resource_type}
                        {a.entity_id ? ` · ${a.entity_id.slice(0, 8)}` : ''}
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
        </>
      )}
    </div>
  );
}
