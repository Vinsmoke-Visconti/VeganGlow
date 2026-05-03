'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { sendOrderConfirmation } from '@/lib/email';
import { normalizePaymentMethod, type PaymentMethod } from '@/lib/payment';

type CheckoutItem = { id: string; quantity: number };

type CheckoutInput = {
  items: CheckoutItem[];
  idempotency_key?: string;
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  ward: string;
  ward_code: string;
  province: string;
  province_code: string;
  payment_method: PaymentMethod;
  note?: string;
  voucher_code?: string;
};

type CheckoutResult =
  | { success: true; order_id: string; order_code: string }
  | { success: false; error: string };

type PaymentStatusResult =
  | {
      success: true;
      order_id: string;
      order_code: string;
      order_status: string;
      payment_status: string;
      paid_at: string | null;
    }
  | { success: false; error: string };

const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9._:-]{16,128}$/;

export async function createOrder(input: CheckoutInput): Promise<CheckoutResult> {
  if (!input.items || input.items.length === 0) {
    return { success: false, error: 'Giỏ hàng trống.' };
  }
  if (!input.customer_name?.trim() || input.customer_name.length > 120) {
    return { success: false, error: 'Họ tên không hợp lệ.' };
  }
  if (!PHONE_REGEX.test(input.phone || '')) {
    return { success: false, error: 'Số điện thoại không hợp lệ.' };
  }
  if (!input.address?.trim()) {
    return { success: false, error: 'Địa chỉ không hợp lệ.' };
  }
  if (!input.province_code?.trim() || !input.province?.trim()) {
    return { success: false, error: 'Vui lòng chọn Tỉnh / Thành phố.' };
  }
  if (!input.ward_code?.trim() || !input.ward?.trim()) {
    return { success: false, error: 'Vui lòng chọn Phường / Xã.' };
  }
  if (!EMAIL_REGEX.test(input.email || '')) {
    return { success: false, error: 'Email không hợp lệ.' };
  }
  if (!['cod', 'card', 'bank_transfer'].includes(input.payment_method)) {
    return { success: false, error: 'Phương thức thanh toán không hợp lệ.' };
  }

  if (
    input.idempotency_key &&
    !IDEMPOTENCY_KEY_REGEX.test(input.idempotency_key)
  ) {
    return { success: false, error: 'Yêu cầu thanh toán không hợp lệ.' };
  }

  for (const item of input.items) {
    if (!item.id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
      return { success: false, error: 'Sản phẩm trong giỏ không hợp lệ.' };
    }
  }

  const supabase = await createClient();
  const paymentMethod = normalizePaymentMethod(input.payment_method);

  // RPC validates stock under FOR UPDATE row locks, inserts order + items,
  // decrements stock — all in one transaction. RAISE inside the function
  // rolls everything back, so there are no orphaned orders or oversold items.
  const rpcArgs = {
    p_customer: {
      name: input.customer_name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address.trim(),
      ward: input.ward.trim(),
      ward_code: input.ward_code.trim(),
      province: input.province.trim(),
      province_code: input.province_code.trim(),
      note: input.note?.trim() ?? '',
    },
    p_items: input.items.map((i) => ({ id: i.id, quantity: i.quantity })),
    p_payment_method: paymentMethod,
    p_idempotency_key: input.idempotency_key ?? null,
    p_voucher_code: input.voucher_code ?? null,
  };

  // Supabase generated types currently lack the new RPC signature; cast once,
  // re-narrow the result locally.
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: typeof rpcArgs
    ) => Promise<{
      data:
        | {
            order_id: string;
            order_code: string;
            total_amount: number;
            reused?: boolean;
          }[]
        | null;
      error: { message: string } | null;
    }>
  )('decrement_stock_and_create_order', rpcArgs);

  if (error || !data || data.length === 0) {
    const msg = error?.message ?? '';
    if (msg.includes('INSUFFICIENT_STOCK:')) {
      const name = msg.split('INSUFFICIENT_STOCK:')[1]?.trim() || 'Sản phẩm';
      return { success: false, error: `Hết hàng: ${name}` };
    }
    if (msg.includes('PRODUCT_INACTIVE')) {
      return { success: false, error: 'Sản phẩm không còn được bán.' };
    }
    if (msg.includes('PRODUCT_NOT_FOUND')) {
      return { success: false, error: 'Không tìm thấy sản phẩm.' };
    }
    if (msg.includes('EMPTY_CART')) {
      return { success: false, error: 'Giỏ hàng trống.' };
    }
    if (msg.includes('INVALID_PAYMENT_METHOD')) {
      return { success: false, error: 'Phương thức thanh toán không hợp lệ.' };
    }
    if (msg.includes('INVALID_CUSTOMER')) {
      return { success: false, error: 'Thông tin giao hàng không hợp lệ.' };
    }
    if (msg.includes('IDEMPOTENCY_KEY_REUSED')) {
      return { success: false, error: 'Yêu cầu thanh toán đã được dùng cho đơn khác.' };
    }
    if (msg.includes('IDEMPOTENCY_IN_PROGRESS')) {
      return { success: false, error: 'Đơn hàng đang được xử lý. Vui lòng thử lại sau.' };
    }
    return { success: false, error: msg || 'Không tạo được đơn hàng.' };
  }

  const { order_id, order_code, total_amount, reused } = data[0];

  revalidatePath('/orders');
  revalidatePath('/products');

  if (!reused && paymentMethod === 'cod') {
    after(async () => {
      try {
        await sendOrderConfirmation(
          input.email.trim(),
          order_code,
          Number(total_amount),
          paymentMethod
        );
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
      }
    });
  }

  return { success: true, order_id, order_code };
}

export async function getOrderPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    return { success: false, error: 'Mã đơn hàng không hợp lệ.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, code, status, payment_status, paid_at')
    .eq('id', orderId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Không tìm thấy đơn hàng.' };

  const row = data as {
    id: string;
    code: string;
    status: string;
    payment_status?: string | null;
    paid_at?: string | null;
  };

  return {
    success: true,
    order_id: row.id,
    order_code: row.code,
    order_status: row.status,
    payment_status: row.payment_status ?? 'unpaid',
    paid_at: row.paid_at ?? null,
  };
}

const ORDER_CODE_REGEX = /^VG-[A-F0-9]+-[A-F0-9]+$/i;

export async function getOrderPaymentStatusByCode(code: string): Promise<PaymentStatusResult> {
  if (typeof code !== 'string' || !ORDER_CODE_REGEX.test(code)) {
    return { success: false, error: 'Mã đơn hàng không hợp lệ.' };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, code, status, payment_status, paid_at')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Không tìm thấy đơn hàng.' };

  const row = data as {
    id: string;
    code: string;
    status: string;
    payment_status?: string | null;
    paid_at?: string | null;
  };

  return {
    success: true,
    order_id: row.id,
    order_code: row.code,
    order_status: row.status,
    payment_status: row.payment_status ?? 'unpaid',
    paid_at: row.paid_at ?? null,
  };
}


export type PublicOrderItem = {
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
};

export type PublicOrderView = {
  id: string;
  code: string;
  status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'cod' | 'bank_transfer' | 'card';
  payment_due_at: string | null;
  paid_at: string | null;
  total_amount: number;
  customer_name: string;
  phone: string;
  address: string;
  ward: string | null;
  province: string | null;
  created_at: string;
  items: PublicOrderItem[];
};

type PublicOrderResult =
  | { ok: true; order: PublicOrderView }
  | { ok: false; reason: 'INVALID' | 'NOT_FOUND' };

export async function getPublicOrderByCode(code: string): Promise<PublicOrderResult> {
  if (typeof code !== 'string' || !ORDER_CODE_REGEX.test(code)) {
    return { ok: false, reason: 'INVALID' };
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .select(
      `id, code, status, payment_status, payment_method, payment_due_at, paid_at,
       total_amount, customer_name, phone, address, ward, province, created_at,
       order_items(product_name, product_image, unit_price, quantity)`,
    )
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (error || !data) return { ok: false, reason: 'NOT_FOUND' };

  type Row = {
    id: string;
    code: string;
    status: PublicOrderView['status'];
    payment_status: PublicOrderView['payment_status'] | null;
    payment_method: PublicOrderView['payment_method'];
    payment_due_at: string | null;
    paid_at: string | null;
    total_amount: number | string;
    customer_name: string;
    phone: string;
    address: string;
    ward: string | null;
    province: string | null;
    created_at: string;
    order_items:
      | {
          product_name: string;
          product_image: string | null;
          unit_price: number | string;
          quantity: number;
        }[]
      | null;
  };

  const row = data as unknown as Row;

  return {
    ok: true,
    order: {
      id: row.id,
      code: row.code,
      status: row.status,
      payment_status: (row.payment_status ?? 'unpaid') as PublicOrderView['payment_status'],
      payment_method: row.payment_method,
      payment_due_at: row.payment_due_at,
      paid_at: row.paid_at,
      total_amount: Number(row.total_amount),
      customer_name: row.customer_name,
      phone: row.phone,
      address: row.address,
      ward: row.ward,
      province: row.province,
      created_at: row.created_at,
      items: (row.order_items ?? []).map((it) => ({
        product_name: it.product_name,
        product_image: it.product_image ?? null,
        unit_price: Number(it.unit_price),
        quantity: it.quantity,
      })),
    },
  };
}
