'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { audit } from '@/lib/security/auditLog';

async function auditCtx() {
  const h = await headers();
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
    userAgent: h.get('user-agent'),
  };
}

type Result = { ok: true } | { ok: false; error: string };
type ManualConfirmResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';

type HasPermissionRpc = (
  fn: 'has_permission',
  args: { p_module: string; p_action: string },
) => Promise<{ data: boolean | null; error: { message: string } | null }>;

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['completed'],
  completed: [],
  cancelled: [],
};

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Result> {
  const supabase = await createClient();
  const hasPermission = supabase.rpc.bind(supabase) as unknown as HasPermissionRpc;

  const [permissionRes, superAdminRes] = await Promise.all([
    hasPermission('has_permission', { p_module: 'orders', p_action: 'write' }),
    supabase.rpc('is_super_admin'),
  ]);

  if (permissionRes.error) return { ok: false, error: permissionRes.error.message };
  if (superAdminRes.error) return { ok: false, error: superAdminRes.error.message };

  const canWrite = Boolean(permissionRes.data);
  const isSuperAdmin = Boolean(superAdminRes.data);

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

  await audit(
    {
      action: status === 'cancelled' ? 'order.cancelled' : 'order.status_changed',
      severity: status === 'cancelled' ? 'warn' : 'info',
      entity: 'order',
      entity_id: id,
      details: { from: currentStatus, to: status },
    },
    await auditCtx()
  );
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
  const { data: isSuperAdmin, error: superAdminError } = await supabase.rpc('is_super_admin');

  if (superAdminError) return { ok: false, error: superAdminError.message };
  if (!isSuperAdmin) {
    return { ok: false, error: 'Chỉ super admin được xác nhận thanh toán thủ công.' };
  }

  const trimmedNote = (note ?? '').trim();
  const confirmPayment = supabase.rpc.bind(supabase) as unknown as AdminConfirmRpc;
  const { data, error } = await confirmPayment(
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
    await audit(
      {
        action: 'order.note_added',
        severity: 'warn',
        entity: 'order',
        entity_id: id,
        details: { manual_payment_confirmed: true, order_code: row.order_code, note: trimmedNote || null },
      },
      await auditCtx()
    );
    return { ok: true, message: row.message };
  }
  if (row.message === 'ALREADY_PAID') {
    return { ok: false, error: 'Đơn đã được thanh toán trước đó.' };
  }
  return { ok: false, error: row.message || 'Không xác nhận được thanh toán.' };
}
