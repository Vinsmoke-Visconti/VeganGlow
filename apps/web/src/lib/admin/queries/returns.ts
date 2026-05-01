import { createClient } from '@/lib/supabase/server';

export type OrderReturnRow = {
  id: string;
  order_id: string;
  rma_code: string;
  reason: string;
  status: string;
  refund_amount: number | null;
  refund_method: string | null;
  customer_note: string | null;
  staff_note: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderStatusHistoryRow = {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function listReturnsForOrder(orderId: string): Promise<OrderReturnRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('order_returns')
    .select(
      'id, order_id, rma_code, reason, status, refund_amount, refund_method, customer_note, staff_note, refunded_at, created_at, updated_at'
    )
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  return (data ?? []) as OrderReturnRow[];
}

export async function listStatusHistoryForOrder(orderId: string): Promise<OrderStatusHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('order_status_history')
    .select('id, order_id, from_status, to_status, changed_by, reason, metadata, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  return (data ?? []) as OrderStatusHistoryRow[];
}

export async function listAllReturns(filters: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<OrderReturnRow[]> {
  const supabase = await createClient();
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  let q = supabase
    .from('order_returns')
    .select(
      'id, order_id, rma_code, reason, status, refund_amount, refund_method, customer_note, staff_note, refunded_at, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (filters.status) q = q.eq('status', filters.status);
  const { data } = await q;
  return (data ?? []) as OrderReturnRow[];
}
