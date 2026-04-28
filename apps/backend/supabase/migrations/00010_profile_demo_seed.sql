-- VeganGlow — Demo seed data for profile-related features
-- Populates notifications, vouchers, and settings for testing

do $$
declare
  v_user_id uuid;
begin
  -- Get the first available user (or we could use a specific email if known)
  select id into v_user_id from public.profiles limit 1;

  if v_user_id is not null then
    -- 1. Seed user settings if not exists
    insert into public.user_settings (user_id, order_updates, promo_emails, wallet_updates)
    values (v_user_id, true, true, true)
    on conflict (user_id) do nothing;

    -- 2. Seed some demo notifications
    insert into public.notifications (user_id, title, content, type, link)
    values 
      (v_user_id, 'Chào mừng bạn đến với VeganGlow!', 'Cảm ơn bạn đã tin tưởng lựa chọn các sản phẩm thuần chay từ chúng tôi. Hãy bắt đầu hành trình chăm sóc da lành tính ngay hôm nay!', 'success', '/products'),
      (v_user_id, 'Voucher mới dành cho bạn', 'Bạn nhận được mã giảm giá 10% cho đơn hàng tiếp theo. Kiểm tra ngay trong mục Voucher nhé!', 'info', '/profile/vouchers'),
      (v_user_id, 'Đơn hàng #VG12345 đã giao thành công', 'Cảm ơn bạn đã mua hàng. Hãy chia sẻ trải nghiệm của bạn bằng cách đánh giá sản phẩm nhé!', 'success', '/profile/orders')
    on conflict do nothing;

    -- 3. Seed some user vouchers (linked to existing vouchers)
    insert into public.user_vouchers (user_id, voucher_id, is_used)
    select v_user_id, id, false
    from public.vouchers
    where code in ('NEWGLOW10', 'FREESHIP')
    on conflict do nothing;

    -- 4. Seed a demo bank account
    insert into public.user_banks (user_id, bank_name, account_number, account_holder, is_default, type)
    values (v_user_id, 'Vietcombank', '1234567890', 'TERRY KOTE', true, 'bank')
    on conflict do nothing;
  end if;
end $$;
