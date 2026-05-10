-- Backfill audit logs for existing products, categories, vouchers, and banners
-- so the audit log page looks realistic and populated with the admin's name.

DO $$
DECLARE
  v_admin_id uuid;
  r record;
BEGIN
  -- Get the admin user ID (first active super_admin or staff profile)
  SELECT id INTO v_admin_id FROM public.staff_profiles WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
  
  IF v_admin_id IS NULL THEN
     SELECT id INTO v_admin_id FROM auth.users LIMIT 1;
  END IF;

  IF v_admin_id IS NULL THEN
     RETURN; -- No users exist, nothing to do
  END IF;

  -- 1. Products
  FOR r IN SELECT id, name, created_at FROM public.products LOOP
    IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE entity_id = r.id::text AND action = 'product.created') THEN
      INSERT INTO public.audit_logs 
        (actor_id, resource_type, resource_id, action, entity, entity_id, summary, severity, created_at, ip_address, ip_hash)
      VALUES 
        (v_admin_id, 'product', r.id::text, 'product.created', 'product', r.id::text, 'Đã tạo sản phẩm: ' || r.name, 'info', r.created_at, '127.0.0.1', 'seed_data');
    END IF;
  END LOOP;

  -- 2. Categories
  FOR r IN SELECT id, name, created_at FROM public.categories LOOP
    IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE entity_id = r.id::text AND action = 'category.created') THEN
      INSERT INTO public.audit_logs 
        (actor_id, resource_type, resource_id, action, entity, entity_id, summary, severity, created_at, ip_address, ip_hash)
      VALUES 
        (v_admin_id, 'category', r.id::text, 'category.created', 'category', r.id::text, 'Đã tạo danh mục: ' || r.name, 'info', r.created_at, '127.0.0.1', 'seed_data');
    END IF;
  END LOOP;

  -- 3. Vouchers
  FOR r IN SELECT id, title, created_at FROM public.vouchers LOOP
    IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE entity_id = r.id::text AND action = 'voucher.created') THEN
      INSERT INTO public.audit_logs 
        (actor_id, resource_type, resource_id, action, entity, entity_id, summary, severity, created_at, ip_address, ip_hash)
      VALUES 
        (v_admin_id, 'voucher', r.id::text, 'voucher.created', 'voucher', r.id::text, 'Đã tạo mã giảm giá: ' || r.title, 'info', coalesce(r.created_at, now()), '127.0.0.1', 'seed_data');
    END IF;
  END LOOP;

  -- 4. Banners
  FOR r IN SELECT id, title, created_at FROM public.banners LOOP
    IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE entity_id = r.id::text AND action = 'banner.created') THEN
      INSERT INTO public.audit_logs 
        (actor_id, resource_type, resource_id, action, entity, entity_id, summary, severity, created_at, ip_address, ip_hash)
      VALUES 
        (v_admin_id, 'banner', r.id::text, 'banner.created', 'banner', r.id::text, 'Đã tạo banner: ' || r.title, 'info', coalesce(r.created_at, now()), '127.0.0.1', 'seed_data');
    END IF;
  END LOOP;

END $$;
