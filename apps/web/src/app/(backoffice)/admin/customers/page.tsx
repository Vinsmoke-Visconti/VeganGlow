'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Search, Loader2, User as UserIcon, Phone, MapPin, ShoppingBag } from 'lucide-react';

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

export default function AdminCustomers() {
  const supabase = createBrowserClient();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
          supabase
            .from('orders')
            .select('user_id, total_amount')
            .neq('status', 'cancelled'),
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
    return () => { alive = false; };
  }, [supabase]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.province?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totals = useMemo(() => {
    return customers.reduce(
      (acc, c) => {
        acc.totalSpent += c.total_spent;
        acc.totalOrders += c.order_count;
        if (c.order_count > 0) acc.activeBuyers += 1;
        return acc;
      },
      { totalSpent: 0, totalOrders: 0, activeBuyers: 0 }
    );
  }, [customers]);

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#1a4d2e' }}>Khách hàng</h1>
        <p style={{ color: '#666' }}>Theo dõi tệp khách hàng VeganGlow và lịch sử mua hàng (CRM).</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Tổng khách hàng" value={customers.length.toString()} />
        <StatCard label="Khách đã đặt hàng" value={totals.activeBuyers.toString()} />
        <StatCard label="Tổng đơn hàng" value={totals.totalOrders.toString()} />
        <StatCard label="Tổng giá trị (VNĐ)" value={totals.totalSpent.toLocaleString('vi-VN')} />
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #eee' }}>
          <div style={{ position: 'relative', maxWidth: 400 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, SĐT, tỉnh/thành..."
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 8, border: '1px solid #eee', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#666' }}>
              <Loader2 className="animate-spin" /> Đang tải khách hàng...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                  <th style={th}>KHÁCH HÀNG</th>
                  <th style={th}>LIÊN HỆ</th>
                  <th style={th}>ĐỊA CHỈ</th>
                  <th style={th}>SỐ ĐƠN</th>
                  <th style={th}>TỔNG CHI TIÊU</th>
                  <th style={th}>NGÀY ĐĂNG KÝ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
                      Chưa có khách hàng nào.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#e8f5e9', color: '#1a4d2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <UserIcon size={18} />
                          </div>
                          <span style={{ fontWeight: 600 }}>{c.full_name || '(Chưa cập nhật)'}</span>
                        </div>
                      </td>
                      <td style={td}>
                        {c.phone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#444' }}>
                            <Phone size={13} /> {c.phone}
                          </span>
                        ) : (
                          <span style={{ color: '#999', fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td style={{ ...td, fontSize: 13, color: '#444' }}>
                        {c.address || c.ward || c.province ? (
                          <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 4 }}>
                            <MapPin size={13} style={{ marginTop: 2 }} />
                            {[c.address, c.ward, c.province].filter(Boolean).join(', ')}
                          </span>
                        ) : (
                          <span style={{ color: '#999' }}>—</span>
                        )}
                      </td>
                      <td style={td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12, backgroundColor: '#f3f4f6', fontSize: 12, fontWeight: 600 }}>
                          <ShoppingBag size={12} /> {c.order_count}
                        </span>
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>{c.total_spent.toLocaleString('vi-VN')}đ</td>
                      <td style={{ ...td, fontSize: 13, color: '#666' }}>
                        {new Date(c.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#666' };
const td: React.CSSProperties = { padding: '1rem 1.5rem' };

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1a4d2e', marginTop: 4 }}>{value}</div>
    </div>
  );
}
