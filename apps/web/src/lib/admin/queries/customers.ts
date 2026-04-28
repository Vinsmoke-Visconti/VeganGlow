import { createClient } from '@/lib/supabase/server';

export type CustomerListFilters = { q?: string };

export type CustomerListRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type OrderAggRow = {
  user_id: string | null;
  total_amount: number | string;
  created_at: string;
  status: string;
};

export async function listCustomers(filters: CustomerListFilters = {}): Promise<CustomerListRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from('profiles')
    .select('id, full_name, avatar_url, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .limit(500);
  if (filters.q) q = q.ilike('full_name', `%${filters.q}%`);
  const { data: profiles } = await q;
  const profileRows = (profiles ?? []) as ProfileRow[];
  const ids = profileRows.map((p) => p.id);
  if (ids.length === 0) return [];

  const { data: orderRows } = await supabase
    .from('orders')
    .select('user_id, total_amount, created_at, status')
    .in('user_id', ids)
    .neq('status', 'cancelled');

  const aggregates = new Map<string, { count: number; total: number; last: string | null }>();
  for (const row of (orderRows ?? []) as OrderAggRow[]) {
    if (!row.user_id) continue;
    const a = aggregates.get(row.user_id) ?? { count: 0, total: 0, last: null };
    a.count += 1;
    a.total += Number(row.total_amount);
    if (!a.last || row.created_at > a.last) a.last = row.created_at;
    aggregates.set(row.user_id, a);
  }

  return profileRows.map((p) => {
    const agg = aggregates.get(p.id);
    return {
      id: p.id,
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
  const [profileRes, addressesRes, ordersRes, vouchersRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('addresses').select('*').eq('user_id', id).order('is_default', { ascending: false }),
    supabase
      .from('orders')
      .select('id, code, total_amount, status, payment_method, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('user_vouchers')
      .select('id, is_used, used_at, voucher:vouchers(code, title, discount_type, discount_value)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
  ]);

  return {
    profile: profileRes.data,
    addresses: addressesRes.data ?? [],
    orders: ordersRes.data ?? [],
    vouchers: vouchersRes.data ?? [],
  };
}
