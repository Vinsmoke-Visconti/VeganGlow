import { createClient } from '@/lib/supabase/server';

export type CustomerListFilters = { q?: string };

export type CustomerListRow = {
  id: string;
  customer_code: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
};

type ProfileRow = {
  id: string;
  customer_code: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type OrderAggRow = {
  user_id: string | null;
  total_amount: number | string;
  created_at: string;
  status: string;
  payment_method?: string | null;
  payment_status?: string | null;
};

function countsAsCustomerSpend(order: OrderAggRow): boolean {
  if (order.status === 'cancelled') return false;
  if (order.payment_status === 'paid') return true;
  return order.payment_method === 'cod' && order.status === 'completed';
}

export async function listCustomers(filters: CustomerListFilters = {}): Promise<CustomerListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('profiles')
    .select('id, customer_code, username, full_name, avatar_url, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters.q) {
    const searchTerm = `%${filters.q}%`;
    query = query.or(`full_name.ilike.${searchTerm},username.ilike.${searchTerm},customer_code.ilike.${searchTerm}`);
  }

  const { data: profiles } = await query;
  const profileRows = (profiles ?? []) as ProfileRow[];
  const ids = profileRows.map((p) => p.id);
  if (ids.length === 0) return [];

  const { data: orderRows } = await supabase
    .from('orders')
    .select('user_id, total_amount, created_at, status, payment_method, payment_status')
    .in('user_id', ids)
    .neq('status', 'cancelled');

  const aggregates = new Map<string, { count: number; total: number; last: string | null }>();
  for (const row of (orderRows ?? []) as OrderAggRow[]) {
    if (!row.user_id) continue;
    const a = aggregates.get(row.user_id) ?? { count: 0, total: 0, last: null };
    a.count += 1;
    if (countsAsCustomerSpend(row)) {
      a.total += Number(row.total_amount);
    }
    if (!a.last || row.created_at > a.last) a.last = row.created_at;
    aggregates.set(row.user_id, a);
  }

  return profileRows.map((p) => {
    const agg = aggregates.get(p.id);
    return {
      id: p.id,
      customer_code: p.customer_code,
      username: p.username,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      total_orders: agg?.count ?? 0,
      total_spent: agg?.total ?? 0,
      last_order_at: agg?.last ?? null,
    };
  });
}

export async function getCustomerDetail(id: string) {
  const supabase = await createClient();
  const [profileRes, addressesRes, ordersRes, vouchersRes, ledgerRes, cartRes, tierRes] = await Promise.all([
    supabase.from('profiles').select('*, tier:loyalty_tiers(name, display_name, badge_color, discount_percent, perks)').eq('id', id).maybeSingle(),
    supabase.from('addresses').select('*').eq('user_id', id).order('is_default', { ascending: false }),
    supabase
      .from('orders')
      .select('id, code, total_amount, status, payment_method, payment_status, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('user_vouchers')
      .select('id, is_used, used_at, voucher:vouchers(code, title, discount_type, discount_value)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('loyalty_points_ledger')
      .select('id, delta, reason, reference_type, reference_id, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('live_carts')
      .select('id, items, subtotal, abandoned, updated_at')
      .eq('user_id', id)
      .maybeSingle(),
    supabase.from('loyalty_tiers').select('*').order('position'),
  ]);

  return {
    profile: profileRes.data,
    addresses: addressesRes.data ?? [],
    orders: ordersRes.data ?? [],
    vouchers: vouchersRes.data ?? [],
    pointsLedger: ledgerRes.data ?? [],
    liveCart: cartRes.data,
    allTiers: tierRes.data ?? [],
  };
}

export async function listAbandonedCarts(limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('live_carts')
    .select('id, user_id, session_id, items, subtotal, updated_at, reminded_at, profile:profiles(full_name, username, customer_code)')
    .eq('abandoned', true)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export type CustomerOverviewKpi = {
  totalCustomers: number;
  newThisMonth: number;
  abandonedCarts: number;
  topSpender: { name: string; spent: number } | null;
};

export async function getCustomerOverviewKpi(): Promise<CustomerOverviewKpi> {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [totalRes, newRes, abandonedRes, topRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
      .gte('created_at', monthStart.toISOString()),
    supabase.from('live_carts').select('*', { count: 'exact', head: true }).eq('abandoned', true),
    supabase
      .from('profiles')
      .select('full_name, username, lifetime_spend')
      .eq('role', 'customer')
      .order('lifetime_spend', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const top = topRes.data as { full_name: string | null; username: string | null; lifetime_spend: number } | null;

  return {
    totalCustomers: totalRes.count ?? 0,
    newThisMonth: newRes.count ?? 0,
    abandonedCarts: abandonedRes.count ?? 0,
    topSpender: top
      ? { name: top.full_name ?? top.username ?? 'Unknown', spent: top.lifetime_spend }
      : null,
  };
}
