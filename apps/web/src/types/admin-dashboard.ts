export type DashboardRange = 'today' | '7d' | '30d';

export type DashboardStats = {
  revenue: number;
  orders: number;
  customers: number;
  lowStock: number;
  prevRevenue: number;
  prevOrders: number;
  prevCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
};

export type DashboardPeriodStats = Record<DashboardRange, DashboardStats>;

export type RecentOrderRow = {
  id: string;
  code: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
};

export type RevenuePoint = {
  date: string;
  total: number;
  orders: number;
};

export type TopProductRow = {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
};

export type OrderStatusBucket = {
  status: string;
  total: number;
};

export type LowStockProduct = {
  id: string;
  name: string;
  slug: string;
  stock: number;
  image: string;
};

export type DashboardSnapshot = {
  range: DashboardRange;
  periodStats: DashboardPeriodStats;
  recentOrders: RecentOrderRow[];
  revenue: RevenuePoint[];
  topProducts: TopProductRow[];
  statusBreakdown: OrderStatusBucket[];
  lowStockProducts: LowStockProduct[];
};

export type AdminDashboardKpisPayload = {
  revenue: number | string;
  orders: number | string;
  customers: number | string;
  low_stock: number | string;
  prev_revenue: number | string;
  prev_orders: number | string;
  prev_customers: number | string;
  average_order_value?: number | string;
  conversion_rate?: number | string;
};
