import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MapPin, ShoppingBag, Ticket, User, Calendar, CreditCard, Hash } from 'lucide-react';
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

import { CustomerEditClient } from '../_components/CustomerEditClient';

type Props = { params: Promise<{ id: string }> };

type ProfileShape = {
  id: string;
  full_name: string | null;
  username: string | null;
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
      <Link href="/admin/customers" className={`${shared.btn} ${shared.btnGhost}`} style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
        <ChevronLeft size={14} /> Danh sách khách hàng
      </Link>

      <div className={styles.grid}>
        {/* LEFT — Profile sidebar */}
        <div>
          <section className={styles.card}>
            <div className={styles.profileRow} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, right: 0 }}>
                 <CustomerEditClient profile={{ id: profile.id, full_name: profile.full_name, username: profile.username }} />
              </div>
              <div className={styles.avatar}>{initial}</div>
              <div className={styles.profileMeta}>
                <h3 className={styles.profileName}>{profile.full_name ?? '—'}</h3>
                <span className={styles.profileSub}>
                  @{profile.username || 'user'}
                </span>
                <span className={styles.profileSub}>
                  <Calendar size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  Tham gia {formatDateShort(profile.created_at)}
                </span>
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

          {/* Addresses */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>
              <MapPin size={14} />
              Địa chỉ ({addresses.length})
            </h3>
            {addresses.length === 0 ? (
              <p style={{ color: 'var(--vg-ink-400)', fontSize: 13, margin: 0 }}>Chưa có địa chỉ</p>
            ) : (
              addresses.map((a) => (
                <div key={a.id} className={styles.addressItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong>{a.full_name}</strong>
                    {a.is_default && (
                      <span className={`${shared.badge} ${shared.badgeSuccess}`}>Mặc định</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--vg-ink-500)', fontSize: 12, marginBottom: 2 }}>
                    <User size={10} /> {a.phone}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--vg-ink-500)' }}>
                    {a.address}
                    {a.ward ? `, ${a.ward}` : ''}
                    {a.province ? `, ${a.province}` : ''}
                    {a.city ? `, ${a.city}` : ''}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Vouchers */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>
              <Ticket size={14} />
              Voucher ({vouchers.length})
            </h3>
            {vouchers.length === 0 ? (
              <p style={{ color: 'var(--vg-ink-400)', fontSize: 13, margin: 0 }}>Chưa nhận voucher</p>
            ) : (
              <ul className={styles.voucherList}>
                {vouchers.map((v) => (
                  <li key={v.id} className={styles.voucherItem}>
                    <span>
                      <strong>{v.voucher?.code ?? '—'}</strong>
                      <span style={{ color: 'var(--vg-ink-400)', marginLeft: 6, fontSize: 11 }}>
                        {v.voucher?.title ?? ''}
                      </span>
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

        {/* RIGHT — Order history */}
        <div>
          <section className={styles.card} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 className={styles.cardTitle}>
              <ShoppingBag size={14} />
              Lịch sử đơn hàng ({orders.length})
            </h3>
            {orders.length === 0 ? (
              <p style={{ color: 'var(--vg-ink-400)', fontSize: 13, margin: 0, flex: 1, display: 'grid', placeItems: 'center' }}>Chưa có đơn nào</p>
            ) : (
              <div className={shared.tableWrap} style={{ flex: 1 }}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th><Hash size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Mã</th>
                      <th>Tổng</th>
                      <th><CreditCard size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Thanh toán</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/admin/orders/${o.id}`} style={{ color: 'var(--vg-leaf-700)', fontWeight: 600, textDecoration: 'none' }}>
                            {o.code}
                          </Link>
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatVND(o.total_amount)}</td>
                        <td style={{ fontSize: 12, color: 'var(--vg-ink-500)' }}>{o.payment_method}</td>
                        <td>
                          <span
                            className={`${shared.badge} ${
                              shared[ORDER_STATUS_BADGE[o.status] ?? 'badgeMuted']
                            }`}
                          >
                            {ORDER_STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--vg-ink-400)' }}>{formatDate(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
