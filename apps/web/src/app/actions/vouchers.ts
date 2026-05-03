'use server';

import { createClient } from '@/lib/supabase/server';

export async function validateVoucher(code: string, orderTotal: number) {
  const supabase = await createClient();

  const { data: voucher, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .single();

  if (error || !voucher) {
    return { ok: false, error: 'Mã giảm giá không tồn tại.' };
  }

  if (voucher.status !== 'active') {
    return { ok: false, error: 'Mã giảm giá hiện không khả dụng.' };
  }

  const now = new Date();
  if (voucher.starts_at && new Date(voucher.starts_at) > now) {
    return { ok: false, error: 'Mã giảm giá chưa đến thời gian sử dụng.' };
  }
  if (voucher.expires_at && new Date(voucher.expires_at) < now) {
    return { ok: false, error: 'Mã giảm giá đã hết hạn.' };
  }

  if (voucher.quota > 0 && voucher.used_count >= voucher.quota) {
    return { ok: false, error: 'Mã giảm giá đã hết lượt sử dụng.' };
  }

  if (orderTotal < Number(voucher.min_order)) {
    return { 
      ok: false, 
      error: `Đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(Number(voucher.min_order))}đ để dùng mã này.` 
    };
  }

  // Calculate discount
  let discountAmount = 0;
  if (voucher.discount_type === 'percent') {
    discountAmount = (orderTotal * Number(voucher.discount_value)) / 100;
  } else {
    discountAmount = Number(voucher.discount_value);
  }

  return { 
    ok: true, 
    discount: discountAmount, 
    voucherId: voucher.id,
    voucherCode: voucher.code,
    title: voucher.title
  };
}
