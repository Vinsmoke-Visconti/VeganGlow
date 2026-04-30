-- Migration to upgrade RBAC with Weights and new Permissions
-- Hierarchy: 1 (Highest) -> 4 (Lowest)

-- 1. Add weight column to roles
alter table public.roles add column if not exists weight int not null default 4;

-- 2. Update existing roles with weights
update public.roles set weight = 1 where name = 'super_admin';
update public.roles set weight = 3 where name in ('product_manager', 'order_manager');
update public.roles set weight = 4 where name in ('customer_support', 'customer');

-- 3. Add new roles from requirement
insert into public.roles (name, display_name, description, weight) values
  ('hr_manager',        'Quản lý Nhân sự',    'Quản lý nhân sự và phân quyền', 2),
  ('inventory_manager', 'Quản lý Kho',        'Điều phối hàng tồn kho', 2),
  ('auditor',           'Kiểm toán hệ thống', 'Xem nhật ký và kiểm tra dữ liệu', 2),
  ('finance_accountant','Kế toán',           'Quản lý tài chính và hoàn tiền', 3),
  ('marketing_manager', 'Quản lý Marketing',  'Quản lý khuyến mãi và nội dung', 3)
on conflict (name) do update set weight = excluded.weight;

-- 4. Add missing permissions
insert into public.permissions (module, action, display_name, description) values
  ('audit', 'read',   'Xem nhật ký',       'Xem nhật ký hoạt động hệ thống'),
  ('audit', 'export', 'Xuất nhật ký',      'Xuất dữ liệu log ra file'),
  ('categories', 'create', 'Tạo danh mục',  'Tạo danh mục sản phẩm'),
  ('categories', 'read',   'Xem danh mục',  'Xem danh sách danh mục'),
  ('categories', 'update', 'Sửa danh mục',  'Cập nhật thông tin danh mục'),
  ('categories', 'delete', 'Xóa danh mục',  'Xóa danh mục sản phẩm'),
  ('content', 'create', 'Tạo nội dung',     'Viết bài/Tạo trang mới'),
  ('content', 'read',   'Xem nội dung',     'Xem danh sách bài viết'),
  ('content', 'update', 'Sửa nội dung',     'Cập nhật bài viết'),
  ('content', 'delete', 'Xóa nội dung',     'Xóa bài viết'),
  ('content', 'publish','Đăng bài',         'Quyền xuất bản nội dung'),
  ('customers', 'read',   'Xem khách hàng', 'Xem thông tin khách hàng'),
  ('customers', 'update', 'Sửa khách hàng', 'Cập nhật thông tin khách hàng'),
  ('customers', 'delete', 'Xóa khách hàng', 'Xóa tài khoản khách hàng'),
  ('customers', 'export', 'Xuất khách hàng','Xuất danh sách khách hàng'),
  ('orders', 'refund', 'Hoàn tiền',         'Thực hiện hoàn tiền đơn hàng'),
  ('inventory', 'read',      'Xem kho',      'Xem tồn kho hệ thống'),
  ('inventory', 'stock_in',  'Nhập kho',     'Thực hiện nhập kho'),
  ('inventory', 'stock_out', 'Xuất kho',     'Thực hiện xuất kho'),
  ('users', 'assign_roles', 'Cấp quyền',     'Thực hiện phân quyền cho nhân sự')
on conflict (module, action) do nothing;

-- 5. User Overrides table (to support Account-specific permissions)
create table if not exists public.user_permissions (
  user_id       uuid not null references public.staff_profiles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id)    on delete cascade,
  is_granted    boolean not null default true, -- true = grant, false = revoke
  primary key (user_id, permission_id)
);

alter table public.user_permissions enable row level security;
create policy user_permissions_read on public.user_permissions for select using (public.is_staff());
