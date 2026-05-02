'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Eye, User, Phone, DollarSign, Clock } from 'lucide-react';
import {
  formatVND,
  formatDate,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  PAYMENT_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_BADGE,
} from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';
import { AdminViewSwitcher, ViewMode } from '../../_components/AdminViewSwitcher';
import { OrdersFilters } from './OrdersFilters';
import { OrderRowActions } from './OrderRowActions';

type Order = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
};

type Props = {
  orders: Order[];
  filters: any;
};

export function OrdersClient({ orders, filters }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  return (
    <>
      <div className={shared.toolbar}>
        <OrdersFilters defaults={filters} />
        <AdminViewSwitcher mode={viewMode} onChange={setViewMode} />
      </div>

      {orders.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Package size={24} />
          </div>
          <p className={shared.emptyTitle}>Không có đơn hàng phù hợp</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Khách</th>
                <th>SĐT</th>
                <th>Tổng</th>
                <th>Trạng thái</th>
                <th>TT</th>
                <th>Tiền</th>
                <th>Lúc</th>
                <th></th>
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
                  <td>{o.customer_name}</td>
                  <td>{o.phone}</td>
                  <td>{formatVND(o.total_amount)}</td>
                  <td>
                    <span className={`${shared.badge} ${shared[ORDER_STATUS_BADGE[o.status] ?? 'badgeMuted']}`}>
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td>{PAYMENT_LABEL[o.payment_method] ?? o.payment_method}</td>
                  <td>
                    <span className={`${shared.badge} ${shared[PAYMENT_STATUS_BADGE[o.payment_status] ?? 'badgeMuted']}`}>
                      {PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status}
                    </span>
                  </td>
                  <td>{formatDate(o.created_at)}</td>
                  <td>
                    <OrderRowActions
                      id={o.id}
                      status={o.status}
                      paymentMethod={o.payment_method}
                      paymentStatus={o.payment_status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={shared.cardGrid}>
          {orders.map((o) => (
            <div key={o.id} className={shared.adminCard}>
              <div className={shared.adminCardHeader}>
                <div>
                  <h3 className={shared.adminCardTitle}>{o.code}</h3>
                  <span className={shared.adminCardSubtitle}>{o.customer_name}</span>
                </div>
                <OrderRowActions
                  id={o.id}
                  status={o.status}
                  paymentMethod={o.payment_method}
                  paymentStatus={o.payment_status}
                />
              </div>
              <div className={shared.adminCardContent}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}>
                    <DollarSign size={14} className={shared.iconMuted} />
                    {formatVND(o.total_amount)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--vg-ink-700)' }}>
                    <Phone size={14} className={shared.iconMuted} />
                    {o.phone}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <span className={`${shared.badge} ${shared[ORDER_STATUS_BADGE[o.status] ?? 'badgeMuted']}`}>
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                    <span className={`${shared.badge} ${shared[PAYMENT_STATUS_BADGE[o.payment_status] ?? 'badgeMuted']}`}>
                      {PAYMENT_STATUS_LABEL[o.payment_status]}
                    </span>
                  </div>
                </div>
              </div>
              <div className={shared.adminCardFooter}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--vg-ink-400)' }}>
                   <Clock size={12} />
                   {formatDate(o.created_at)}
                 </div>
                 <Link href={`/admin/orders/${o.id}`} style={{ fontSize: 12, fontWeight: 800, color: 'var(--vg-leaf-700)' }}>
                   XEM ĐƠN →
                 </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
