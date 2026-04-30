import { createClient } from '@/lib/supabase/server';

export type DashboardRange = 'today' | '7d' | '30d';

export type DashboardStats = {
  revenue: number;
  orders: number;
  customers: number;
  lowStock: number;
};

export type RecentOrderRow = {
  id: string;
  code: string;
  customer_name: string;
  total_amount: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string;
};

function countsAsRevenue(order: {
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
}): boolean {
  if (order.status === 'cancelled') return false;
  if (order.payment_status === 'paid') return true;
  return order.payment_method === 'cod' && order.status === 'completed';
}

function rangeStart(range: DashboardRange): Date {
  const d = new Date();
  if (range === 'today') {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === '7d') {
    d.setDate(d.getDate() - 7);
    return d;
  }
  d.setDate(d.getDate() - 30);
  return d;
}

export async function getDashboardStats(range: DashboardRange): Promise<DashboardStats> {
  const supabase = await createClient();
  const since = rangeStart(range).toISOString();

  const [ordersRes, lowStockRes, customersRes] = await Promise.all([
    supabase.from('orders').select('total_amount, status, payment_method, payment_status').gte('created_at', since),
    supabase.from('products').select('*', { count: 'exact', head: true }).lt('stock', 5),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
  ]);

  type OrderAgg = {
    status: string;
    payment_status?: string | null;
    payment_method?: string | null;
    total_amount: number | string;
  };
  const orders = (ordersRes.data ?? []) as OrderAgg[];
  const revenue = orders
    .filter(countsAsRevenue)
    .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);

  return {
    revenue,
    orders: orders.length,
    customers: customersRes.count ?? 0,
    lowStock: lowStockRes.count ?? 0,
  };
}

export async function getRecentOrders(limit = 5): Promise<RecentOrderRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('id, code, customer_name, total_amount, status, payment_status, payment_method, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as RecentOrderRow[];
}

export async function getRevenueSparkline(days = 7): Promise<{ date: string; total: number }[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('orders')
    .select('total_amount, created_at, status, payment_method, payment_status')
    .gte('created_at', since.toISOString())
    .neq('status', 'cancelled');

  const buckets: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  type SparkRow = {
    total_amount: number | string;
    created_at: string;
    status: string;
    payment_status?: string | null;
    payment_method?: string | null;
  };
  for (const row of (data ?? []) as SparkRow[]) {
    if (!countsAsRevenue(row)) continue;
    const key = row.created_at.slice(0, 10);
    if (key in buckets) buckets[key] += Number(row.total_amount);
  }
  return Object.entries(buckets).map(([date, total]) => ({ date, total }));
}

export async function getTopProducts(days = 7, limit = 5) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from('order_items')
    .select('product_id, product_name, quantity, unit_price, order:orders!inner(created_at, status, payment_method, payment_status)')
    .gte('orders.created_at', since.toISOString())
    .neq('orders.status', 'cancelled');

  type Row = {
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number | string;
    order?: {
      status: string;
      payment_status?: string | null;
      payment_method?: string | null;
    };
  };
  const totals = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const row of (data ?? []) as Row[]) {
    if (row.order && !countsAsRevenue(row.order)) continue;
    const key = row.product_id ?? row.product_name;
    const t = totals.get(key) ?? { name: row.product_name, qty: 0, revenue: 0 };
    t.qty += row.quantity;
    t.revenue += Number(row.unit_price) * row.quantity;
    totals.set(key, t);
  }
  return Array.from(totals.entries())
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, limit)
    .map(([id, t]) => ({ id, name: t.name, quantity: t.qty, revenue: t.revenue }));
}
