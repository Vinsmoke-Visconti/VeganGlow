'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true } | { ok: false; error: string };
type ManualConfirmResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['completed'],
  completed: [],
  cancelled: [],
};

type HasPermissionRpc = (
  fn: 'has_permission',
  args: { p_module: string; p_action: string },
) => Promise<{ data: boolean | null; error: { message: string } | null }>;

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Result> {
  const supabase = await createClient();
  const hasPermission = supabase.rpc as unknown as HasPermissionRpc;

  const [{ data: canWrite }, { data: isSuperAdmin }] = await Promise.all([
    hasPermission('has_permission', { p_module: 'orders', p_action: 'write' }),
    supabase.rpc('is_super_admin'),
  ]);

  if (!canWrite && !isSuperAdmin) {
    return { ok: false, error: 'Bạn không có quyền cập nhật đơn hàng.' };
  }

  const { data: current, error: currentError } = await supabase
    .from('orders')
    .select('status, payment_method, payment_status')
    .eq('id', id)
    .maybeSingle();

  if (currentError) return { ok: false, error: currentError.message };
  if (!current) return { ok: false, error: 'Không tìm thấy đơn hàng.' };

  const currentOrder = current as {
    status: OrderStatus;
    payment_method: string;
    payment_status?: string | null;
  };
  const currentStatus = currentOrder.status;
  if (currentStatus !== status && !NEXT_STATUSES[currentStatus]?.includes(status)) {
    return { ok: false, error: `Không thể chuyển đơn từ ${currentStatus} sang ${status}.` };
  }

  if (
    currentOrder.payment_method === 'bank_transfer' &&
    currentOrder.payment_status !== 'paid' &&
    status !== 'cancelled'
  ) {
    return {
      ok: false,
      error: 'Đơn chuyển khoản chỉ được xác nhận sau khi webhook ngân hàng ghi nhận tiền vào tài khoản.',
    };
  }

  const { error } = await supabase
    .from('orders')
    .update({ status } as never)
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin');
  return { ok: true };
}

type AdminConfirmRpcResult = {
  order_id: string | null;
  order_code: string | null;
  transaction_id: string | null;
  payment_status: string | null;
  order_status: string | null;
  message: string;
};

type AdminConfirmRpc = (
  fn: 'admin_confirm_bank_transfer_payment',
  args: { p_order_id: string; p_note: string | null },
) => Promise<{ data: AdminConfirmRpcResult[] | null; error: { message: string } | null }>;

/**
 * Super-admin escape hatch: manually mark a bank_transfer order as paid
 * when the bank webhook is unavailable. Records a synthetic
 * payment_transactions row (provider='manual') for audit.
 */
export async function adminConfirmBankTransferPayment(
  id: string,
  note?: string,
): Promise<ManualConfirmResult> {
  const supabase = await createClient();
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) {
    return { ok: false, error: 'Chỉ super admin được xác nhận thanh toán thủ công.' };
  }

  const trimmedNote = (note ?? '').trim();
  const { data, error } = await (supabase.rpc as unknown as AdminConfirmRpc)(
    'admin_confirm_bank_transfer_payment',
    { p_order_id: id, p_note: trimmedNote.length > 0 ? trimmedNote : null },
  );

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: 'Không nhận được phản hồi từ server.' };
  }

  const row = data[0];
  if (row.message === 'PAYMENT_CONFIRMED') {
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath('/admin');
    return { ok: true, message: row.message };
  }
  if (row.message === 'ALREADY_PAID') {
    return { ok: false, error: 'Đơn đã được thanh toán trước đó.' };
  }
  return { ok: false, error: row.message || 'Không xác nhận được thanh toán.' };
}
