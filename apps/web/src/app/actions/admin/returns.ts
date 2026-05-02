'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { audit } from '@/lib/security/auditLog';

type Result = { ok: true; id?: string; rma_code?: string } | { ok: false; error: string };

async function auditCtx() {
  const h = await headers();
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
    userAgent: h.get('user-agent'),
  };
}

type GenerateRmaRpc = (
  fn: 'generate_rma_code',
  args: Record<string, never>
) => Promise<{ data: string | null; error: { message: string } | null }>;

export type CreateReturnInput = {
  order_id: string;
  reason: string;
  customer_note: string | null;
  items: Array<{ order_item_id: string; quantity: number; reason: string | null }>;
};

export async function createReturnRequest(input: CreateReturnInput): Promise<Result> {
  const supabase = await createClient();

  const generateRma = supabase.rpc.bind(supabase) as unknown as GenerateRmaRpc;
  const { data: rmaCode, error: rmaErr } = await generateRma('generate_rma_code', {});
  if (rmaErr || !rmaCode) {
    return { ok: false, error: rmaErr?.message ?? 'Không tạo được RMA code' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { data: ret, error } = await supabase
    .from('order_returns')
    .insert({
      order_id: input.order_id,
      rma_code: rmaCode,
      reason: input.reason,
      customer_note: input.customer_note,
      requested_by: user?.id ?? null,
      status: 'requested',
    } as never)
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  const returnId = (ret as { id: string }).id;

  // Batch insert all items in a single query (avoids N+1)
  if (input.items.length > 0) {
    const { error: itemErr } = await supabase
      .from('order_return_items')
      .insert(
        input.items.map(item => ({
          return_id: returnId,
          order_item_id: item.order_item_id,
          quantity: item.quantity,
          reason: item.reason,
        })) as never[]
      );
    if (itemErr) return { ok: false, error: itemErr.message };
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${input.order_id}`);

  await audit(
    {
      action: 'order.note_added',
      severity: 'warn',
      entity: 'order',
      entity_id: input.order_id,
      details: { return_requested: true, rma_code: rmaCode, reason: input.reason },
    },
    await auditCtx()
  );

  return { ok: true, id: returnId, rma_code: rmaCode };
}

export type UpdateReturnStatusInput = {
  return_id: string;
  status: 'approved' | 'received' | 'refunded' | 'rejected' | 'cancelled';
  staff_note?: string;
  refund_amount?: number;
  refund_method?: 'bank_transfer' | 'wallet_credit' | 'replace';
};

export async function updateReturnStatus(input: UpdateReturnStatusInput): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Lookup current to get order_id for audit + revalidate
  const { data: current } = await supabase
    .from('order_returns')
    .select('order_id, status, rma_code')
    .eq('id', input.return_id)
    .single();
  if (!current) return { ok: false, error: 'Return not found' };
  const cur = current as { order_id: string; status: string; rma_code: string };

  type Patch = {
    status: string;
    staff_note?: string;
    refund_amount?: number;
    refund_method?: string;
    approved_by?: string;
    refunded_by?: string;
    refunded_at?: string;
  };
  const patch: Patch = { status: input.status };
  if (input.staff_note !== undefined) patch.staff_note = input.staff_note;
  if (input.refund_amount !== undefined) patch.refund_amount = input.refund_amount;
  if (input.refund_method !== undefined) patch.refund_method = input.refund_method;
  if (input.status === 'approved') patch.approved_by = user?.id;
  if (input.status === 'refunded') {
    patch.refunded_by = user?.id;
    patch.refunded_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('order_returns')
    .update(patch as never)
    .eq('id', input.return_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${cur.order_id}`);

  await audit(
    {
      action: input.status === 'refunded' ? 'order.refunded' : 'order.note_added',
      severity: input.status === 'refunded' ? 'warn' : 'info',
      entity: 'order',
      entity_id: cur.order_id,
      details: {
        rma_code: cur.rma_code,
        from: cur.status,
        to: input.status,
        refund_amount: input.refund_amount,
        refund_method: input.refund_method,
      },
    },
    await auditCtx()
  );

  return { ok: true, id: input.return_id };
}
