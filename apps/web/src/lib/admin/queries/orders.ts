import { createClient } from '@/lib/supabase/server';

export type OrderListFilters = {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
};

export type OrderRow = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  address: string;
  city: string;
};

export async function listOrders(filters: OrderListFilters = {}): Promise<OrderRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('orders')
    .select('id, code, customer_name, phone, total_amount, status, payment_method, created_at, address, city')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filters.q) {
    const safe = filters.q.replace(/[%,]/g, '');
    query = query.or(`code.ilike.%${safe}%,customer_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as OrderRow[];
}

export async function getOrder(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
