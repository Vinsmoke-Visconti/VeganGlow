-- Migration: Enhance staff invitations with tokens and expiry
-- This ensures we don't break the existing table but add the necessary fields for the interactive flow.

do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='staff_invitations' and column_name='token') then
    alter table public.staff_invitations add column token text unique default gen_random_uuid()::text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='staff_invitations' and column_name='expires_at') then
    alter table public.staff_invitations add column expires_at timestamptz default (now() + interval '7 days');
  end if;
end $$;

-- Update RLS if needed (already managed by super_admin)

-- Seed/Update Standard roles for the 4 team members' roles
insert into public.roles (name, display_name, description) values
  ('manager', 'Quản lý vận hành', 'Toàn quyền quản lý cửa hàng trừ nhân sự và cài đặt hệ thống'),
  ('staff', 'Nhân viên bán hàng', 'Xem đơn hàng, sản phẩm và cập nhật trạng thái đơn hàng'),
  ('editor', 'Biên tập viên', 'Quản lý nội dung sản phẩm, danh mục và banner tiếp thị')
on conflict (name) do update set 
  display_name = excluded.display_name,
  description = excluded.description;

-- Ensure permissions are mapped (idempotent)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'manager'
  and p.module in ('products', 'orders', 'customers', 'marketing', 'inventory')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'staff'
  and (
    (p.module = 'orders' and p.action in ('read', 'write')) or
    (p.module = 'products' and p.action = 'read') or
    (p.module = 'customers' and p.action = 'read')
  )
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'editor'
  and (
    (p.module = 'products') or
    (p.module = 'marketing')
  )
on conflict do nothing;
