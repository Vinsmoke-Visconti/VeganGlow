import Link from 'next/link';
import { Users, Eye } from 'lucide-react';
import { listCustomers } from '@/lib/admin/queries/customers';
import { formatVND, formatDateShort } from '@/lib/admin/format';
import shared from '../admin-shared.module.css';
import { CustomersFilter } from './_components/CustomersFilter';

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminCustomers({ searchParams }: Props) {
  const { q } = await searchParams;
  const customers = await listCustomers({ q });

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Khách hàng</h1>
          <p className={shared.pageSubtitle}>{customers.length} khách hàng</p>
        </div>
      </div>

      <CustomersFilter defaultQ={q} />

      {customers.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Users size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có khách hàng phù hợp</p>
        </div>
      ) : (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
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
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/customers/${c.id}`}>
                      <strong>{c.full_name ?? '—'}</strong>
                    </Link>
                  </td>
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
      )}
    </div>
  );
}
