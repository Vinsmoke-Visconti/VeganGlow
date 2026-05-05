begin;

-- 1. Create Flash Sales for specific products
-- Note: Using subqueries to find IDs by slug for safety
insert into public.flash_sales (product_id, discount_percent, starts_at, ends_at, status)
values
  (
    (select id from public.products where slug = 'tinh-chat-rau-ma'),
    20.00,
    now() - interval '1 hour',
    now() + interval '7 days',
    'active'
  ),
  (
    (select id from public.products where slug = 'chong-nang-tra-xanh'),
    15.00,
    now() - interval '1 hour',
    now() + interval '3 days',
    'active'
  )
on conflict do nothing;

-- 2. Create Vouchers (Coupons)
insert into public.vouchers (code, title, discount_type, discount_value, min_order, quota, used_count, expires_at, status)
values
  ('NEWBIE100', 'Chào mừng người mới - Giảm 100k', 'fixed', 100000, 200000, 1000, 0, now() + interval '30 days', 'active'),
  ('GLOW20', 'Ưu đãi VeganGlow - Giảm 20%', 'percentage', 20.00, 300000, 500, 0, now() + interval '14 days', 'active'),
  ('SAVER20', 'Tiết kiệm mỗi ngày - Giảm 20k', 'fixed', 20000, 150000, 2000, 0, now() + interval '7 days', 'active')
on conflict (code) do update set
  status = 'active',
  expires_at = excluded.expires_at,
  discount_value = excluded.discount_value,
  min_order = excluded.min_order;

commit;
