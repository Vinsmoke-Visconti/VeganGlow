import { createClient } from '@/lib/supabase/server';
import type {
  AdminDashboardKpisPayload,
  DashboardPeriodStats,
  DashboardRange,
  DashboardSnapshot,
  DashboardStats,
  LowStockProduct,
  OrderStatusBucket,
  RecentOrderRow,
  RevenuePoint,
  TopProductRow,
} from '@/types/admin-dashboard';

type RpcResult = { data: unknown; error: unknown };
type RpcFn = (name: string, args: Record<string, unknown>) => Promise<RpcResult>;

const EMPTY_STATS: DashboardStats = {
  revenue: 0,
  orders: 0,
  customers: 0,
  lowStock: 0,
  prevRevenue: 0,
  prevOrders: 0,
  prevCustomers: 0,
  averageOrderValue: 0,
  conversionRate: 0,
};

function rangeWindow(range: DashboardRange): { since: Date; until: Date } {
  const until = new Date();
  const since = new Date(until);

  if (range === 'today') {
    since.setHours(0, 0, 0, 0);
  } else if (range === '7d') {
    since.setDate(since.getDate() - 7);
  } else {
    since.setDate(since.getDate() - 30);
  }

  return { since, until };
}

function messageFromError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }

  return 'Unable to load admin dashboard data';
}

function mapKpis(payload: AdminDashboardKpisPayload): DashboardStats {
  return {
    revenue: Number(payload.revenue ?? 0),
    orders: Number(payload.orders ?? 0),
    customers: Number(payload.customers ?? 0),
    lowStock: Number(payload.low_stock ?? 0),
    prevRevenue: Number(payload.prev_revenue ?? 0),
    prevOrders: Number(payload.prev_orders ?? 0),
    prevCustomers: Number(payload.prev_customers ?? 0),
    averageOrderValue: Number(payload.average_order_value ?? 0),
    conversionRate: Number(payload.conversion_rate ?? 0),
  };
}

async function fetchStats(rpc: RpcFn, range: DashboardRange): Promise<DashboardStats> {
  const { since, until } = rangeWindow(range);
  const { data, error } = await rpc('admin_dashboard_kpis', {
    p_since: since.toISOString(),
    p_until: until.toISOString(),
  });

  if (error) throw new Error(messageFromError(error));
  if (!data) return EMPTY_STATS;

  return mapKpis(data as AdminDashboardKpisPayload);
}

export async function fetchAdminDashboardSnapshotServer(
  range: DashboardRange,
): Promise<DashboardSnapshot> {
  const supabase = await createClient();
  const rpc = supabase.rpc.bind(supabase) as unknown as RpcFn;
  const sparkDays = range === '30d' ? 30 : 7;
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    today,
    week,
    month,
    recent,
    revenue,
    topProducts,
    statusBreakdown,
    lowStockProducts,
  ] = await Promise.all([
    fetchStats(rpc, 'today'),
    fetchStats(rpc, '7d'),
    fetchStats(rpc, '30d'),
    supabase
      .from('orders')
      .select('id, code, customer_name, total_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(6),
    rpc('admin_dashboard_revenue_series', { p_days: sparkDays }),
    rpc('admin_dashboard_top_products', { p_days: sparkDays, p_limit: 5 }),
    rpc('admin_dashboard_status_breakdown', { p_since: since.toISOString() }),
    supabase
      .from('products')
      .select('id, name, slug, stock, image')
      .eq('is_active', true)
      .lt('stock', 5)
      .order('stock', { ascending: true })
      .order('name', { ascending: true })
      .limit(6),
  ]);

  const firstError =
    recent.error ||
    revenue.error ||
    topProducts.error ||
    statusBreakdown.error ||
    lowStockProducts.error;

  if (firstError) throw new Error(messageFromError(firstError));

  const periodStats: DashboardPeriodStats = {
    today,
    '7d': week,
    '30d': month,
  };

  type RevenueRpcRow = { bucket_date: string; revenue: number | string; orders: number | string };
  type TopProductsRpcRow = {
    product_id: string | null;
    product_name: string;
    quantity: number | string;
    revenue: number | string;
  };
  type StatusRpcRow = { status: string; total: number | string };

  return {
    range,
    periodStats,
    recentOrders: (recent.data ?? []) as RecentOrderRow[],
    revenue: ((revenue.data ?? []) as RevenueRpcRow[]).map((point): RevenuePoint => ({
      date: point.bucket_date,
      total: Number(point.revenue ?? 0),
      orders: Number(point.orders ?? 0),
    })),
    topProducts: ((topProducts.data ?? []) as TopProductsRpcRow[]).map((product): TopProductRow => ({
      id: product.product_id ?? product.product_name,
      name: product.product_name,
      quantity: Number(product.quantity ?? 0),
      revenue: Number(product.revenue ?? 0),
    })),
    statusBreakdown: ((statusBreakdown.data ?? []) as StatusRpcRow[]).map((bucket): OrderStatusBucket => ({
      status: bucket.status,
      total: Number(bucket.total ?? 0),
    })),
    lowStockProducts: (lowStockProducts.data ?? []) as LowStockProduct[],
  };
}
