'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  Search,
  Loader2,
  User as UserIcon,
  Phone,
  MapPin,
  ShoppingBag,
  X,
  Mail,
  Calendar,
  TrendingUp,
  Crown,
  Eye,
} from 'lucide-react';
import styles from '../admin-shared.module.css';

type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  ward: string | null;
  province: string | null;
  role: string;
  created_at: string;
};

type OrderStat = {
  user_id: string;
  total_amount: number;
};

type CustomerWithStats = Customer & {
  order_count: number;
  total_spent: number;
};

type CustomerOrder = {
  id: string;
  code: string | null;
  total_amount: number;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'badgePending',
  confirmed: 'badgeInfo',
  shipping: 'badgeShipping',
  completed: 'badgeSuccess',
  cancelled: 'badgeDanger',
};

const VIP_THRESHOLD = 5_000_000;

function getCustomerTier(spent: number): { label: string; cls: string } | null {
  if (spent >= VIP_THRESHOLD) return { label: 'VIP', cls: 'badgeSuccess' };
  if (spent >= 1_000_000) return { label: 'Khách thân thiết', cls: 'badgeInfo' };
  if (spent > 0) return { label: 'Khách mới', cls: 'badgeNeutral' };
  return null;
}

export default function AdminCustomers() {
  const supabase = createBrowserClient();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<CustomerWithStats | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [profilesRes, ordersRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, phone, address, ward, province, role, created_at')
            .eq('role', 'customer')
            .order('created_at', { ascending: false }),
          supabase.from('orders').select('user_id, total_amount').neq('status', 'cancelled'),
        ]);

        if (profilesRes.error) throw profilesRes.error;
        if (ordersRes.error) throw ordersRes.error;
        if (!alive) return;

        const stats = new Map<string, { count: number; spent: number }>();
        for (const o of (ordersRes.data as OrderStat[]) || []) {
          if (!o.user_id) continue;
          const cur = stats.get(o.user_id) || { count: 0, spent: 0 };
          cur.count += 1;
          cur.spent += Number(o.total_amount);
          stats.set(o.user_id, cur);
        }

        const list: CustomerWithStats[] = ((profilesRes.data as Customer[]) || []).map((c) => {
          const s = stats.get(c.id);
          return { ...c, order_count: s?.count || 0, total_spent: s?.spent || 0 };
        });

        setCustomers(list);
      } catch (err: any) {
        alert('Lỗi khi tải danh sách khách hàng: ' + err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  async function openDetail(customer: CustomerWithStats) {
    setSelected(customer);
    setSelectedOrders([]);
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, code, total_amount, status, created_at')
        .eq('user_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setSelectedOrders((data as CustomerOrder[]) || []);
    } catch (err: any) {
      alert('Lỗi khi tải đơn hàng: ' + err.message);
    } finally {
      setLoadingOrders(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.province?.toLowerCase().includes(q),
    );
  }, [customers, search]);

  const totals = useMemo(
    () =>
      customers.reduce(
        (acc, c) => {
          acc.totalSpent += c.total_spent;
          acc.totalOrders += c.order_count;
          if (c.order_count > 0) acc.activeBuyers += 1;
          if (c.total_spent >= VIP_THRESHOLD) acc.vip += 1;
          return acc;
        },
        { totalSpent: 0, totalOrders: 0, activeBuyers: 0, vip: 0 },
      ),
    [customers],
  );

  const aov = totals.totalOrders > 0 ? totals.totalSpent / totals.totalOrders : 0;

  const customerLifetimeOrders = selected
    ? selectedOrders.filter((o) => o.status !== 'cancelled')
    : [];
  const lastOrderDate = selectedOrders[0]?.created_at;
  const customerAov =
    customerLifetimeOrders.length > 0
      ? customerLifetimeOrders.reduce((s, o) => s + Number(o.total_amount), 0) /
        customerLifetimeOrders.length
      : 0;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Khách hàng</h1>
          <p className={styles.pageSubtitle}>
            Theo dõi tệp khách hàng VeganGlow, lịch sử mua hàng và phân tích CRM.
          </p>
        </div>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Tổng khách hàng</div>
          <div className={styles.statValue}>{customers.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Khách đã đặt hàng</div>
          <div className={styles.statValue}>{totals.activeBuyers}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Khách VIP (≥ 5tr)</div>
          <div className={styles.statValue}>{totals.vip}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>AOV trung bình</div>
          <div className={styles.statValue}>{Math.round(aov).toLocaleString('vi-VN')}đ</div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, SĐT, tỉnh/thành..."
              className={styles.searchInput}
            />
          </div>
        </div>

        <div className={styles.tableScroll}>
          {loading ? (
            <div className={styles.loadingState}>
              <Loader2 className="animate-spin" size={22} />
              Đang tải khách hàng...
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Phân hạng</th>
                  <th>Liên hệ</th>
                  <th>Địa chỉ</th>
                  <th>Số đơn</th>
                  <th>Tổng chi tiêu</th>
                  <th>Ngày đăng ký</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className={styles.emptyState}>
                        Không tìm thấy khách hàng nào khớp với tìm kiếm.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const tier = getCustomerTier(c.total_spent);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className={styles.productCell}>
                            <div className={styles.avatarCircle}>
                              <UserIcon size={16} />
                            </div>
                            <span style={{ fontWeight: 600 }}>
                              {c.full_name || '(Chưa cập nhật)'}
                            </span>
                          </div>
                        </td>
                        <td>
                          {tier ? (
                            <span
                              className={`${styles.badge} ${styles[tier.cls]}`}
                              style={{ display: 'inline-flex', gap: 4 }}
                            >
                              {tier.label === 'VIP' && <Crown size={12} />}
                              {tier.label}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                              Chưa mua
                            </span>
                          )}
                        </td>
                        <td>
                          {c.phone ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 13,
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              <Phone size={13} /> {c.phone}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {c.address || c.ward || c.province ? (
                            <span
                              style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 4 }}
                            >
                              <MapPin
                                size={13}
                                style={{ marginTop: 2, flexShrink: 0 }}
                              />
                              {[c.address, c.ward, c.province].filter(Boolean).join(', ')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                            <ShoppingBag size={12} /> {c.order_count}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {c.total_spent.toLocaleString('vi-VN')}đ
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                          {new Date(c.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td>
                          <button
                            className={styles.btnOutline}
                            onClick={() => openDetail(c)}
                            title="Xem chi tiết"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selected && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className={`${styles.modal} ${styles.modalWide}`}>
            <button className={styles.modalCloseBtn} onClick={() => setSelected(null)}>
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div
                className={styles.avatarCircle}
                style={{ width: 64, height: 64, fontSize: 22 }}
              >
                {selected.full_name?.charAt(0)?.toUpperCase() || <UserIcon size={26} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 className={styles.modalTitle} style={{ marginBottom: 4 }}>
                  {selected.full_name || '(Chưa cập nhật tên)'}
                </h2>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {selected.phone && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={13} /> {selected.phone}
                    </span>
                  )}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={13} /> Đăng ký từ{' '}
                    {new Date(selected.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
              {(() => {
                const tier = getCustomerTier(selected.total_spent);
                if (!tier) return null;
                return (
                  <span
                    className={`${styles.badge} ${styles[tier.cls]}`}
                    style={{ fontSize: 13, padding: '6px 14px' }}
                  >
                    {tier.label === 'VIP' && <Crown size={14} />}
                    {tier.label}
                  </span>
                );
              })()}
            </div>

            {/* CRM stats */}
            <div className={styles.infoGrid} style={{ marginBottom: 16 }}>
              <div className={styles.infoPanel}>
                <div className={styles.infoPanelTitle}>Tổng chi tiêu (LTV)</div>
                <div
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 800,
                    color: 'var(--color-primary-dark)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {selected.total_spent.toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div className={styles.infoPanel}>
                <div className={styles.infoPanelTitle}>Số đơn / AOV</div>
                <div
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 800,
                    color: 'var(--color-primary-dark)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {selected.order_count}
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 500,
                      color: 'var(--color-text-muted)',
                      marginLeft: 8,
                    }}
                  >
                    · {Math.round(customerAov).toLocaleString('vi-VN')}đ/đơn
                  </span>
                </div>
              </div>
            </div>

            {/* Address */}
            {(selected.address || selected.ward || selected.province) && (
              <div className={styles.infoPanel} style={{ marginBottom: 16 }}>
                <div className={styles.infoPanelTitle}>
                  <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Địa chỉ giao hàng
                </div>
                <div className={styles.infoLine}>
                  {[selected.address, selected.ward, selected.province]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            )}

            {/* Order history */}
            <div className={styles.sectionTitle}>
              <ShoppingBag
                size={16}
                style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }}
              />
              Lịch sử đơn hàng
              {lastOrderDate && (
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    fontWeight: 500,
                    marginLeft: 8,
                  }}
                >
                  Đơn gần nhất:{' '}
                  {new Date(lastOrderDate).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>

            <div className={styles.subTable}>
              {loadingOrders ? (
                <div className={styles.loadingState}>
                  <Loader2 className="animate-spin" size={20} />
                  Đang tải đơn hàng...
                </div>
              ) : selectedOrders.length === 0 ? (
                <div className={styles.emptyState}>
                  Khách hàng chưa có đơn hàng nào.
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Ngày</th>
                      <th>Tổng tiền</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <span className={styles.codeText}>
                            #{o.code || o.id.slice(0, 6)}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                          {new Date(o.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {Number(o.total_amount).toLocaleString('vi-VN')}đ
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${styles[STATUS_BADGE[o.status] || 'badgeNeutral']}`}
                          >
                            {STATUS_LABEL[o.status] || o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Quick contact actions */}
            <div className={styles.actionBtns} style={{ marginTop: 16 }}>
              {selected.phone && (
                <a
                  href={`tel:${selected.phone}`}
                  className={`${styles.btnAction} ${styles.btnActionGreen}`}
                >
                  <Phone size={14} /> Gọi điện
                </a>
              )}
              {selected.phone && (
                <a
                  href={`sms:${selected.phone}`}
                  className={`${styles.btnAction} ${styles.btnActionBlue}`}
                >
                  <Mail size={14} /> Gửi SMS
                </a>
              )}
              <button
                className={styles.btnOutline}
                onClick={() => setSelected(null)}
                style={{ marginLeft: 'auto' }}
              >
                <TrendingUp size={14} /> Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
