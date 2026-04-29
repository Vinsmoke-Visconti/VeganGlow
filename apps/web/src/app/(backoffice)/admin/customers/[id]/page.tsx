import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MapPin, ShoppingBag, Ticket } from 'lucide-react';
import { getCustomerDetail } from '@/lib/admin/queries/customers';
import {
  formatVND,
  formatDate,
  formatDateShort,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
} from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';
import styles from './customer-detail.module.css';

type Props = { params: Promise<{ id: string }> };

type ProfileShape = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
};

type AddressShape = {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  ward: string | null;
  province: string | null;
  is_default: boolean;
};

type OrderShape = {
  id: string;
  code: string;
  total_amount: number | string;
  status: string;
  payment_method: string;
  created_at: string;
};

type UserVoucherShape = {
  id: string;
  is_used: boolean;
  used_at: string | null;
  voucher: {
    code: string;
    title: string;
    discount_type: string;
    discount_value: number;
  } | null;
};

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getCustomerDetail(id);
  const profile = detail.profile as ProfileShape | null;
  if (!profile) notFound();

  const addresses = detail.addresses as AddressShape[];
  const orders = detail.orders as OrderShape[];
  const vouchers = detail.vouchers as UserVoucherShape[];

  const totalSpent = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const initial = (profile.full_name ?? '?').charAt(0).toUpperCase();

  return (
    <div className={shared.page}>
      <Link href="/admin/customers" className={`${shared.btn} ${shared.btnGhost}`}>
        <ChevronLeft size={14} /> Danh sách khách hàng
      </Link>

      <div className={shared.pageHeader} style={{ marginTop: 12 }}>
        <div>
          <h1 className={shared.pageTitle}>{profile.full_name ?? '—'}</h1>
          <p className={shared.pageSubtitle}>
            Thành viên từ {formatDateShort(profile.created_at)}
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <div>
          <section className={styles.card}>
            <div className={styles.profileRow}>
              <div className={styles.avatar}>{initial}</div>
              <div className={styles.profileMeta}>
                <h3 className={styles.profileName}>{profile.full_name ?? '—'}</h3>
                <span className={styles.profileSub}>ID: {profile.id.slice(0, 8)}…</span>
              </div>
            </div>

            <div className={styles.kpiCol}>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Đơn hoàn thành</div>
                <div className={styles.kpiValue}>{completedCount}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Tổng chi tiêu</div>
                <div className={styles.kpiValue}>{formatVND(totalSpent)}</div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>
              <MapPin size={14} style={{ display: 'inline', marginRight: 6 }} />
              Địa chỉ ({addresses.length})
            </h3>
            {addresses.length === 0 ? (
              <p style={{ color: 'var(--vg-ink-500)', fontSize: 13 }}>Chưa có địa chỉ</p>
            ) : (
              addresses.map((a) => (
                <div key={a.id} className={styles.addressItem}>
                  <div>
                    <strong>{a.full_name}</strong>
                    {a.is_default && (
                      <span
                        className={`${shared.badge} ${shared.badgeSuccess}`}
                        style={{ marginLeft: 6 }}
                      >
                        Mặc định
                      </span>
                    )}
                  </div>
                  <div>{a.phone}</div>
                  <div>
                    {a.address}
                    {a.ward ? `, ${a.ward}` : ''}
                    {a.province ? `, ${a.province}` : ''}
                    {a.city ? `, ${a.city}` : ''}
                  </div>
                </div>
              ))
            )}
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>
              <Ticket size={14} style={{ display: 'inline', marginRight: 6 }} />
              Voucher ({vouchers.length})
            </h3>
            {vouchers.length === 0 ? (
              <p style={{ color: 'var(--vg-ink-500)', fontSize: 13 }}>Chưa nhận voucher</p>
            ) : (
              <ul className={styles.voucherList}>
                {vouchers.map((v) => (
                  <li key={v.id} className={styles.voucherItem}>
                    <span>
                      <strong>{v.voucher?.code ?? '—'}</strong> · {v.voucher?.title ?? ''}
                    </span>
                    <span
                      className={`${shared.badge} ${
                        v.is_used ? shared.badgeMuted : shared.badgeSuccess
                      }`}
                    >
                      {v.is_used ? 'Đã dùng' : 'Có thể dùng'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div>
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>
              <ShoppingBag size={14} style={{ display: 'inline', marginRight: 6 }} />
              Lịch sử đơn hàng ({orders.length})
            </h3>
            {orders.length === 0 ? (
              <p style={{ color: 'var(--vg-ink-500)', fontSize: 13 }}>Chưa có đơn nào</p>
            ) : (
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tổng</th>
                    <th>Trạng thái</th>
                    <th>Lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/orders/${o.id}`}>
                          <strong>{o.code}</strong>
                        </Link>
                      </td>
                      <td>{formatVND(o.total_amount)}</td>
                      <td>
                        <span
                          className={`${shared.badge} ${
                            shared[ORDER_STATUS_BADGE[o.status] ?? 'badgeMuted']
                          }`}
                        >
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>
                      <td>{formatDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
