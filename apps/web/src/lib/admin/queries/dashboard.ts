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

/**
 * Compare current period vs previous period of same length.
 * Returns { current, previous, deltaPercent }.
 */
export async function getDashboardStatsWithCompare(range: DashboardRange) {
  const current = await getDashboardStats(range);

  // Previous period (same length, ending at current start)
  const supabase = await createClient();
  const start = rangeStart(range);
  const previousStart = new Date(start);
  const lengthMs = Date.now() - start.getTime();
  previousStart.setTime(start.getTime() - lengthMs);

  const { data: prevOrders } = await supabase
    .from('orders')
    .select('total_amount, status, payment_method, payment_status')
    .gte('created_at', previousStart.toISOString())
    .lt('created_at', start.toISOString());

  type OrderAgg = {
    status: string;
    payment_status?: string | null;
    payment_method?: string | null;
    total_amount: number | string;
  };
  const prev = (prevOrders ?? []) as OrderAgg[];
  const prevRevenue = prev.filter(countsAsRevenue).reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

  const pct = (now: number, before: number) => {
    if (before === 0) return now > 0 ? 100 : 0;
    return ((now - before) / before) * 100;
  };

  return {
    current,
    previous: { revenue: prevRevenue, orders: prev.length },
    delta: {
      revenuePct: pct(current.revenue, prevRevenue),
      ordersPct: pct(current.orders, prev.length),
    },
  };
}

/**
 * Conversion rate = orders that became paid / unique customers who placed orders.
 * Approximation since we don't track session/visitor count without analytics.
 */
export async function getConversionRate(range: DashboardRange): Promise<{
  totalOrders: number;
  paidOrders: number;
  conversionPct: number;
}> {
  const supabase = await createClient();
  const since = rangeStart(range).toISOString();
  const { data } = await supabase
    .from('orders')
    .select('status, payment_status, payment_method')
    .gte('created_at', since);

  type OrderAgg = {
    status: string;
    payment_status?: string | null;
    payment_method?: string | null;
  };
  const orders = (data ?? []) as OrderAgg[];
  const total = orders.length;
  const paid = orders.filter(countsAsRevenue).length;
  return {
    totalOrders: total,
    paidOrders: paid,
    conversionPct: total === 0 ? 0 : (paid / total) * 100,
  };
}

/**
 * Revenue breakdown by category — for pie chart.
 */
export async function getRevenueByCategory(
  range: DashboardRange
): Promise<{ category: string; revenue: number }[]> {
  const supabase = await createClient();
  const since = rangeStart(range).toISOString();
  const { data } = await supabase
    .from('order_items')
    .select(
      'quantity, unit_price, order:orders!inner(created_at, status, payment_method, payment_status), product:products(category:categories(name))'
    )
    .gte('orders.created_at', since)
    .neq('orders.status', 'cancelled');

  type Row = {
    quantity: number;
    unit_price: number | string;
    order?: {
      status: string;
      payment_status?: string | null;
      payment_method?: string | null;
    };
    product?: { category?: { name: string } | { name: string }[] | null } | null;
  };

  const totals = new Map<string, number>();
  for (const row of (data ?? []) as Row[]) {
    if (row.order && !countsAsRevenue(row.order)) continue;
    const cat = Array.isArray(row.product?.category)
      ? row.product?.category[0]?.name
      : row.product?.category?.name;
    const key = cat ?? 'Khác';
    totals.set(key, (totals.get(key) ?? 0) + Number(row.unit_price) * row.quantity);
  }
  return Array.from(totals.entries())
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getTopProducts(days = 7, limit = 5) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from('order_items')
    .select('product_id, product_name, quantity, unit_price, order:orders!inner(created_at, status, payment_method, payment_status), product:products(image, category_id, categories(name))')
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
    product?: {
      image: string | null;
      category_id: string | null;
      categories: { name: string } | null;
    } | null;
  };
  const totals = new Map<string, { name: string; qty: number; revenue: number; image: string | null; category: string | null }>();
  for (const row of (data ?? []) as Row[]) {
    if (row.order && !countsAsRevenue(row.order)) continue;
    const key = row.product_id ?? row.product_name;
    const cat = Array.isArray(row.product?.categories) ? row.product?.categories[0]?.name : row.product?.categories?.name;
    const t = totals.get(key) ?? { 
      name: row.product_name, 
      qty: 0, 
      revenue: 0,
      image: row.product?.image ?? null,
      category: cat ?? null
    };
    t.qty += row.quantity;
    t.revenue += Number(row.unit_price) * row.quantity;
    totals.set(key, t);
  }
  return Array.from(totals.entries())
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, limit)
    .map(([id, t]) => ({ id, name: t.name, quantity: t.qty, revenue: t.revenue, image: t.image, category: t.category }));
}
