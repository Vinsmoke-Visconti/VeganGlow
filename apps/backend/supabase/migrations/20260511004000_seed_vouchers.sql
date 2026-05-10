-- 20260511004000_seed_vouchers.sql
-- Seeds 20 realistic vouchers for the storefront (Freeship, Percentage, Fixed Amount)

begin;

insert into public.vouchers (code, title, discount_type, discount_value, min_order, quota, expires_at, status) values
('FREESHIP20', 'Miễn phí vận chuyển 20k', 'shipping', 20000, 150000, 1000, now() + interval '30 days', 'active'),
('FREESHIP30', 'Miễn phí vận chuyển 30k', 'shipping', 30000, 300000, 500, now() + interval '30 days', 'active'),
('FREESHIP50', 'Miễn phí vận chuyển 50k cực đã', 'shipping', 50000, 500000, 200, now() + interval '30 days', 'active'),
('WELCOME10', 'Chào bạn mới giảm 10%', 'percent', 10, 0, 500, now() + interval '90 days', 'active'),
('VEGANGLOW5', 'Giảm nhẹ 5% cho đơn 200k', 'percent', 5, 200000, 1000, now() + interval '60 days', 'active'),
('GIAM50K', 'Giảm trực tiếp 50k', 'fixed', 50000, 500000, 100, now() + interval '30 days', 'active'),
('GIAM100K', 'Giảm siêu sốc 100k', 'fixed', 100000, 1000000, 50, now() + interval '30 days', 'active'),
('PAYOS15', 'Giảm 15% khi qua PayOS', 'percent', 15, 0, 300, now() + interval '30 days', 'active'),
('XINCHAO2026', 'Quà tặng 2026 giảm 26k', 'fixed', 26000, 0, 2026, now() + interval '365 days', 'active'),
('CUOITUAN', 'Cuối tuần thả ga giảm 8%', 'percent', 8, 300000, 500, now() + interval '7 days', 'active'),
('FLASH20', 'Flash sale giảm 20%', 'percent', 20, 500000, 50, now() + interval '1 days', 'active'),
('MUAXUAN15', 'Ưu đãi mùa xuân 15%', 'percent', 15, 250000, 200, now() + interval '30 days', 'active'),
('FREESHIPVIP', 'Freeship siêu đỉnh 50k', 'shipping', 50000, 200000, 100, now() + interval '14 days', 'active'),
('TRIAN100', 'Tri ân khách hàng giảm 100k', 'fixed', 100000, 800000, 100, now() + interval '30 days', 'active'),
('HOANXU', 'Giảm siêu nhẹ 5%', 'percent', 5, 100000, 1000, now() + interval '30 days', 'active'),
('SILVER15', 'Giảm 15% cho bạn', 'percent', 15, 300000, 500, now() + interval '30 days', 'active'),
('GOLD20', 'Giảm 20% đặc quyền', 'percent', 20, 500000, 300, now() + interval '30 days', 'active'),
('PLATINUM25', 'Giảm 25% đẳng cấp', 'percent', 25, 800000, 100, now() + interval '30 days', 'active'),
('DIAMOND30', 'Giảm 30% tối thượng', 'percent', 30, 1000000, 50, now() + interval '30 days', 'active'),
('DIAMONDFREE', 'Tặng ngay 150k', 'fixed', 150000, 500000, 50, now() + interval '30 days', 'active')
on conflict (code) do nothing;

commit;
