'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendOrderConfirmation } from '@/lib/email';

type CheckoutItem = { id: string; quantity: number };

type CheckoutInput = {
  items: CheckoutItem[];
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  ward: string;
  ward_code: string;
  province: string;
  province_code: string;
  payment_method: 'cod' | 'card';
  note?: string;
};

type CheckoutResult =
  | { success: true; order_id: string; order_code: string }
  | { success: false; error: string };

const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  if (!['cod', 'card'].includes(input.payment_method)) {
    return { success: false, error: 'Phương thức thanh toán không hợp lệ.' };
  }

  for (const item of input.items) {
    if (!item.id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
      return { success: false, error: 'Sản phẩm trong giỏ không hợp lệ.' };
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const productIds = input.items.map((i) => i.id);
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, image, price, stock, is_active')
    .in('id', productIds);

  if (prodErr || !products) {
    return { success: false, error: 'Không tải được sản phẩm.' };
  }

  type Product = { id: string; name: string; image: string; price: number; stock: number; is_active: boolean };
  const productMap = new Map<string, Product>(
    (products as Product[]).map((p) => [p.id, p])
  );

  let totalAmount = 0;
  const orderItemsDraft = [];
  for (const item of input.items) {
    const product = productMap.get(item.id);
    if (!product || !product.is_active) {
      return { success: false, error: `Sản phẩm không tồn tại: ${item.id}` };
    }
    if (product.stock < item.quantity) {
      return { success: false, error: `Hết hàng: ${product.name}` };
    }
    totalAmount += Number(product.price) * item.quantity;
    orderItemsDraft.push({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image,
      unit_price: product.price,
      quantity: item.quantity,
    });
  }

  const code = `VG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 0xfff).toString(16).toUpperCase()}`;

  const { data: order, error: orderErr } = await (supabase.from('orders') as any)
    .insert({
      code,
      user_id: user?.id ?? null,
      customer_name: input.customer_name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address.trim(),
      city: input.province.trim(), // legacy "city" mirrors province for back-compat
      ward: input.ward.trim(),
      ward_code: input.ward_code.trim(),
      province: input.province.trim(),
      province_code: input.province_code.trim(),
      note: input.note?.trim() || null,
      payment_method: input.payment_method,
      total_amount: totalAmount,
    })
    .select('id, code')
    .single();

  if (orderErr || !order) {
    return { success: false, error: orderErr?.message || 'Không tạo được đơn hàng.' };
  }

  const orderRow = order as { id: string; code: string };

  const { error: itemsErr } = await (supabase.from('order_items') as any).insert(
    orderItemsDraft.map((it) => ({ ...it, order_id: orderRow.id }))
  );

  if (itemsErr) {
    return { success: false, error: itemsErr.message };
  }

  for (const item of input.items) {
    const { data: ok } = await (supabase.rpc as any)('decrement_stock', {
      p_product_id: item.id,
      p_quantity: item.quantity,
    });
    if (ok === false) {
      // Atomic decrement failed (race condition) — log; order already created.
      console.warn(`Stock decrement failed for ${item.id}; possible oversell`);
    }
  }

  revalidatePath('/orders');
  revalidatePath('/products');

  try {
    await sendOrderConfirmation(input.email, orderRow.code, totalAmount);
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
  }

  return { success: true, order_id: orderRow.id, order_code: orderRow.code };
}
