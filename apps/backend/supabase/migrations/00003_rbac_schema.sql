-- VeganGlow RBAC schema — adds roles, permissions, and staff_profiles
-- Used by admin backoffice (apps/web/src/app/(backoffice))

-- ============== ROLES ==============
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

insert into public.roles (name, display_name, description) values
  ('super_admin',       'Quản trị tối cao', 'Toàn quyền hệ thống'),
  ('product_manager',   'Quản lý Sản phẩm', 'Quản lý sản phẩm và danh mục'),
  ('order_manager',     'Quản lý Đơn hàng', 'Xử lý đơn hàng và giao vận'),
  ('inventory_manager', 'Quản lý Kho',      'Theo dõi tồn kho'),
  ('customer_support',  'Hỗ trợ Khách hàng','Trả lời và xử lý yêu cầu khách'),
  ('customer',          'Khách hàng',       'Người dùng đầu cuối')
on conflict (name) do nothing;

-- ============== PERMISSIONS ==============
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null,
  display_name text not null default '',
  description text not null default '',
  created_at timestamptz not null default now(),
  unique (module, action)
);

insert into public.permissions (module, action, display_name, description) values
  ('products', 'read',   'Xem sản phẩm',      'Xem sản phẩm'),
  ('products', 'write',  'Sửa sản phẩm',      'Sửa sản phẩm'),
  ('products', 'delete', 'Xóa sản phẩm',      'Xóa sản phẩm'),
  ('orders',   'read',   'Xem đơn hàng',      'Xem đơn hàng'),
  ('orders',   'write',  'Cập nhật đơn hàng', 'Cập nhật đơn hàng'),
  ('users',    'read',   'Xem nhân sự',       'Xem nhân sự'),
  ('users',    'write',  'Thêm/sửa nhân sự',  'Thêm/sửa nhân sự')
on conflict (module, action) do nothing;

-- ============== ROLE_PERMISSIONS ==============
create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles(id)       on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- super_admin gets every permission
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'super_admin'
on conflict do nothing;

-- ============== STAFF_PROFILES ==============
create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists staff_profiles_role_idx on public.staff_profiles(role_id);

-- ============== HELPER FUNCTIONS ==============
create or replace function public.is_staff()
returns boolean language sql stable as $$
  select exists(
    select 1 from public.staff_profiles
    where id = auth.uid() and is_active = true
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable as $$
  select exists(
    select 1 from public.staff_profiles sp
    join public.roles r on r.id = sp.role_id
    where sp.id = auth.uid() and sp.is_active = true and r.name = 'super_admin'
  );
$$;

create or replace function public.has_permission(p_module text, p_action text)
returns boolean language sql stable as $$
  select exists(
    select 1
    from public.staff_profiles sp
    join public.role_permissions rp on rp.role_id = sp.role_id
    join public.permissions p on p.id = rp.permission_id
    where sp.id = auth.uid() and sp.is_active = true
      and p.module = p_module and p.action = p_action
  );
$$;

-- Update is_admin() to also recognize active staff
create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
      or public.is_staff();
$$;

-- ============== RLS ==============
alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_profiles   enable row level security;

drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select using (public.is_staff() or public.is_admin());

drop policy if exists permissions_read on public.permissions;
create policy permissions_read on public.permissions for select using (public.is_staff() or public.is_admin());

drop policy if exists role_permissions_read on public.role_permissions;
create policy role_permissions_read on public.role_permissions for select using (public.is_staff() or public.is_admin());

drop policy if exists staff_profiles_read on public.staff_profiles;
create policy staff_profiles_read on public.staff_profiles for select
  using (id = auth.uid() or public.is_super_admin());

drop policy if exists staff_profiles_write on public.staff_profiles;
create policy staff_profiles_write on public.staff_profiles for all
  using (public.is_super_admin()) with check (public.is_super_admin());
