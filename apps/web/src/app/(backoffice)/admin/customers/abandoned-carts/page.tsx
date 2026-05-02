import { listAbandonedCarts } from '@/lib/admin/queries/customers';
import { formatVND, formatDate } from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';

export const metadata = { title: 'Giỏ hàng bị bỏ - Admin' };

type CartItem = { product_id?: string; name?: string; quantity?: number; price?: number };
type Cart = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  items: CartItem[];
  subtotal: number;
  updated_at: string;
  reminded_at: string | null;
  profile?: { full_name: string | null; username: string | null; customer_code: string | null } | { full_name: string | null; username: string | null; customer_code: string | null }[] | null;
};

export default async function AbandonedCartsPage() {
  const carts = (await listAbandonedCarts(100)) as Cart[];

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Giỏ hàng bị bỏ</h1>
          <p className={shared.pageSubtitle}>
            {carts.length} giỏ đã không hoạt động ≥24h. Tiếp thị lại qua email/SMS.
          </p>
        </div>
      </div>

      <div className={shared.card}>
        {carts.length === 0 ? (
          <div className={shared.emptyState}>
            <div className={shared.emptyIcon}>
              <ShoppingCart size={24} />
            </div>
            <p className={shared.emptyTitle}>Chưa có giỏ hàng bị bỏ</p>
          </div>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Tổng</th>
                  <th>Bỏ lúc</th>
                  <th>Đã nhắc</th>
                </tr>
              </thead>
              <tbody>
                {carts.map((c) => {
                  const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
                  const name = profile?.full_name ?? profile?.username ?? (c.session_id ? `anon:${c.session_id.slice(0, 8)}` : '—');
                  const itemCount = Array.isArray(c.items) ? c.items.length : 0;
                  return (
                    <tr key={c.id}>
                      <td>
                        {c.user_id ? (
                          <Link href={`/admin/customers/${c.user_id}`}>
                            <strong>{name}</strong>
                          </Link>
                        ) : (
                          <span>{name}</span>
                        )}
                      </td>
                      <td>{itemCount} sản phẩm</td>
                      <td>{formatVND(c.subtotal)}</td>
                      <td>{formatDate(c.updated_at)}</td>
                      <td>{c.reminded_at ? formatDate(c.reminded_at) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
