import { z } from 'zod';

export const checkoutItemSchema = z.object({
  id: z.string().uuid('Sản phẩm trong giỏ không hợp lệ'),
  quantity: z.number().int().min(1, 'Số lượng tối thiểu là 1').max(999, 'Số lượng tối đa là 999'),
});

export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'Giỏ hàng trống').max(100, 'Quá nhiều sản phẩm trong giỏ'),
  idempotency_key: z
    .string()
    .regex(/^[A-Za-z0-9._:-]{16,128}$/, 'Yêu cầu thanh toán không hợp lệ')
    .optional(),
  customer_name: z.string().trim().min(2, 'Họ tên quá ngắn').max(120, 'Họ tên quá dài'),
  phone: z.string().regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ').max(200, 'Email quá dài'),
  address: z.string().trim().min(3, 'Địa chỉ không hợp lệ').max(250, 'Địa chỉ quá dài'),
  province: z.string().trim().min(1, 'Vui lòng chọn Tỉnh / Thành phố'),
  province_code: z.string().trim().min(1, 'Vui lòng chọn Tỉnh / Thành phố'),
  ward: z.string().trim().min(1, 'Vui lòng chọn Phường / Xã'),
  ward_code: z.string().trim().min(1, 'Vui lòng chọn Phường / Xã'),
  payment_method: z.enum(['cod', 'card', 'bank_transfer'], {
    message: 'Phương thức thanh toán không hợp lệ',
  }),
  note: z.string().trim().max(500, 'Ghi chú quá dài').optional().nullable(),
  voucher_code: z.string().trim().max(50, 'Mã giảm giá quá dài').optional().nullable(),
});

export type CheckoutInputSchema = z.infer<typeof checkoutSchema>;
