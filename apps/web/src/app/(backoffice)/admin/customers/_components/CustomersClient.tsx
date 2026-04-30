'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, User, ShoppingBag, CreditCard, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatVND, formatDateShort } from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';
import { AdminViewSwitcher, ViewMode } from '../../_components/AdminViewSwitcher';
import { CustomersFilter } from './CustomersFilter';

type Customer = {
  id: string;
  full_name: string | null;
  username: string | null;
  customer_code: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
};

type Props = {
  customers: Customer[];
  q?: string;
};

export function CustomersClient({ customers, q }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const router = useRouter();

  function handleRowClick(id: string) {
    router.push(`/admin/customers/${id}`);
  }

  return (
    <>
      <div className={shared.toolbar}>
        <CustomersFilter defaultQ={q} />
        <AdminViewSwitcher mode={viewMode} onChange={setViewMode} />
      </div>

      {customers.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <User size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có khách hàng phù hợp</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Mã KH</th>
                <th>Username</th>
                <th>Họ tên</th>
                <th>Đơn đã mua</th>
                <th>Tổng chi tiêu</th>
                <th>Đơn cuối</th>
                <th>Thành viên từ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr 
                  key={c.id} 
                  className={shared.clickableRow}
                  onClick={() => handleRowClick(c.id)}
                >
                  <td>
                    <span className={shared.badge}>{c.customer_code ?? '—'}</span>
                  </td>
                  <td>
                    <Link href={`/admin/customers/${c.id}`}>
                      <strong>{c.username ?? '—'}</strong>
                    </Link>
                  </td>
                  <td>{c.full_name ?? '—'}</td>
                  <td>{c.total_orders}</td>
                  <td>{formatVND(c.total_spent)}</td>
                  <td>{c.last_order_at ? formatDateShort(c.last_order_at) : '—'}</td>
                  <td>{formatDateShort(c.created_at)}</td>
                  <td>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                      aria-label="Xem hồ sơ"
                    >
                      <Eye size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={shared.cardGrid}>
          {customers.map((c) => (
            <div 
              key={c.id} 
              className={shared.adminCard}
              style={{ cursor: 'pointer' }}
              onClick={() => handleRowClick(c.id)}
            >
              <div className={shared.adminCardHeader}>
                <div>
                  <h3 className={shared.adminCardTitle}>{c.full_name || c.username || 'Khách hàng'}</h3>
                  <span className={shared.adminCardSubtitle}>{c.customer_code || 'Chưa có mã'}</span>
                </div>
                <Link href={`/admin/customers/${c.id}`} className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}>
                  <Eye size={14} />
                </Link>
              </div>
              <div className={shared.adminCardContent}>
                <div style={{ display: 'flex', gap: 'var(--vg-space-4)', marginTop: 'var(--vg-space-2)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--vg-text-xs)', color: 'var(--vg-ink-500)', marginBottom: 4 }}>Đơn mua</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <ShoppingBag size={14} className={shared.iconMuted} />
                      {c.total_orders}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--vg-text-xs)', color: 'var(--vg-ink-500)', marginBottom: 4 }}>Chi tiêu</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <CreditCard size={14} className={shared.iconMuted} />
                      {formatVND(c.total_spent)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 'var(--vg-space-3)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--vg-text-xs)', color: 'var(--vg-ink-500)' }}>
                  <Calendar size={12} />
                  Tham gia: {formatDateShort(c.created_at)}
                </div>
              </div>
              <div className={shared.adminCardFooter}>
                 <span style={{ fontSize: 'var(--vg-text-xs)' }}>
                   {c.last_order_at ? `Đơn cuối: ${formatDateShort(c.last_order_at)}` : 'Chưa có đơn hàng'}
                 </span>
                 <Link href={`/admin/customers/${c.id}`} style={{ fontSize: 'var(--vg-text-xs)', fontWeight: 800, color: 'var(--vg-leaf-700)' }}>
                   CHI TIẾT →
                 </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
