-- VeganGlow Admin Features — Profile extras + Marketing tables + Audit log
-- Used by:
--   - apps/web/src/app/(backoffice)/admin/profile (department, position, bio + activity)
--   - apps/web/src/app/(backoffice)/admin/marketing (vouchers, banners)

-- ============== STAFF_PROFILES EXTRAS ==============
alter table public.staff_profiles
  add column if not exists department text,
  add column if not exists position   text,
  add column if not exists bio        text,
  add column if not exists username   text,
  add column if not exists first_name text,
  add column if not exists last_name  text;

-- Enforce username uniqueness when present (allows multiple NULLs)
create unique index if not exists staff_profiles_username_uniq
  on public.staff_profiles (lower(username))
  where username is not null;

-- Same split-name fields on customer profiles for consistent UI
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text;

-- ============== VOUCHERS ==============
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  -- 'percent' (% off), 'fixed' (VND off), 'shipping' (free ship up to X)
  discount_type text not null check (discount_type in ('percent', 'fixed', 'shipping')),
  -- For percent: 1-100. For fixed/shipping: VND amount.
  discount_value numeric(12, 2) not null check (discount_value >= 0),
  min_order numeric(12, 2) not null default 0 check (min_order >= 0),
  quota integer not null default 0 check (quota >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  -- 'active' | 'scheduled' | 'expired' | 'draft'
  status text not null default 'draft'
    check (status in ('active', 'scheduled', 'expired', 'draft')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists vouchers_status_idx on public.vouchers(status);
create index if not exists vouchers_expires_idx on public.vouchers(expires_at);

-- ============== BANNERS ==============
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  cover_gradient text,         -- e.g. 'linear-gradient(135deg,#a8e6a8 0%,#d4f1d4 100%)'
  link_url text,
  -- 'home_hero' | 'home_sub' | 'blog_index' | 'category_top'
  placement text not null default 'home_hero'
    check (placement in ('home_hero', 'home_sub', 'blog_index', 'category_top')),
  status text not null default 'draft'
    check (status in ('active', 'scheduled', 'draft', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists banners_placement_idx on public.banners(placement, status);

-- ============== AUDIT_LOGS ==============
-- Lightweight audit trail for admin actions. Backs the Profile > Activity tab.
-- NOTE: an earlier migration may already have created this table with a uuid id
-- and a `resource_type` column. We create it idempotently and ALSO add the
-- columns our app expects so both shapes coexist.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  resource_type text not null default 'unknown',
  resource_id text,
  action text not null,
  -- 'product' | 'order' | 'voucher' | 'staff' | ...
  entity text,
  entity_id text,
  summary text,
  details jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- Backfill columns for installations where audit_logs already existed.
alter table public.audit_logs
  add column if not exists entity     text,
  add column if not exists entity_id  text,
  add column if not exists summary    text,
  add column if not exists details    jsonb,
  add column if not exists ip_address text;

create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_resource_idx
  on public.audit_logs(resource_type, resource_id);

-- Helper: write an audit log entry from app code.
drop function if exists public.log_admin_action(text, text, text, text, jsonb);
create or replace function public.log_admin_action(
  p_action  text,
  p_entity  text,
  p_summary text,
  p_entity_id text default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (public.is_staff() or public.is_super_admin()) then
    raise exception 'Only staff can write audit logs';
  end if;

  insert into public.audit_logs
    (actor_id, resource_type, resource_id, action, entity, entity_id, summary, details)
  values
    (auth.uid(), p_entity, p_entity_id, p_action, p_entity, p_entity_id, p_summary, p_metadata)
  returning id into v_id;

  return v_id;
end $$;

revoke all on function public.log_admin_action(text, text, text, text, jsonb) from public;
grant execute on function public.log_admin_action(text, text, text, text, jsonb)
  to authenticated;

-- ============== RLS ==============
alter table public.vouchers   enable row level security;
alter table public.banners    enable row level security;
alter table public.audit_logs enable row level security;

-- Vouchers
drop policy if exists vouchers_read_public on public.vouchers;
create policy vouchers_read_public on public.vouchers
  for select to anon, authenticated
  using (status = 'active' and (expires_at is null or expires_at > now()));

drop policy if exists vouchers_read_staff on public.vouchers;
create policy vouchers_read_staff on public.vouchers
  for select using (public.is_staff());

drop policy if exists vouchers_write_staff on public.vouchers;
create policy vouchers_write_staff on public.vouchers
  for all using (public.has_permission('marketing', 'write') or public.is_super_admin())
  with check  (public.has_permission('marketing', 'write') or public.is_super_admin());

-- Banners (storefront reads active banners, staff manages)
drop policy if exists banners_read_public on public.banners;
create policy banners_read_public on public.banners
  for select to anon, authenticated
  using (status = 'active'
         and (starts_at is null or starts_at <= now())
         and (ends_at is null or ends_at > now()));

drop policy if exists banners_read_staff on public.banners;
create policy banners_read_staff on public.banners
  for select using (public.is_staff());

drop policy if exists banners_write_staff on public.banners;
create policy banners_write_staff on public.banners
  for all using (public.has_permission('marketing', 'write') or public.is_super_admin())
  with check  (public.has_permission('marketing', 'write') or public.is_super_admin());

-- Audit logs: staff can read their own; super_admin reads everything
drop policy if exists audit_logs_self on public.audit_logs;
create policy audit_logs_self on public.audit_logs
  for select using (actor_id = auth.uid() or public.is_super_admin());

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert with check (public.is_staff() and actor_id = auth.uid());

-- ============== EXTRA PERMISSIONS ==============
insert into public.permissions (module, action, display_name, description) values
  ('marketing', 'read',  'Xem Tiếp thị', 'Xem khuyến mãi & banner'),
  ('marketing', 'write', 'Quản lý Tiếp thị', 'Quản lý khuyến mãi & banner'),
  ('audit',     'read',  'Xem Nhật ký', 'Xem nhật ký hoạt động')
on conflict (module, action) do nothing;

-- Marketing manager seed role + grant marketing.write
insert into public.roles (name, display_name, description) values
  ('marketing_manager', 'Quản lý Tiếp thị', 'Quản lý voucher, banner, flash sale')
on conflict (name) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'marketing_manager'
  and ((p.module = 'marketing' and p.action in ('read', 'write'))
       or (p.module = 'products' and p.action = 'read'))
on conflict do nothing;

-- super_admin gets the new permissions automatically
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'super_admin'
  and ((p.module = 'marketing' and p.action in ('read', 'write'))
       or (p.module = 'audit' and p.action = 'read'))
on conflict do nothing;

-- ============== AUTO-UPDATE last_login_at ==============
-- Cheap trigger so the Profile page can show it without an Edge Function.
create or replace function public.touch_staff_last_login()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.staff_profiles
     set last_login_at = now()
   where id = new.user_id;
  return new;
end $$;

drop trigger if exists on_auth_session_created on auth.sessions;
create trigger on_auth_session_created
  after insert on auth.sessions
  for each row execute procedure public.touch_staff_last_login();

-- ============== DEMO SEED (idempotent — only runs if tables empty) ==============
-- For the MIS demo deliverable. Safe to drop in production.

do $$
begin
  if not exists (select 1 from public.vouchers limit 1) then
    insert into public.vouchers (code, title, discount_type, discount_value, min_order, quota, used_count, expires_at, status) values
      ('NEWGLOW10', 'Giảm 10% cho đơn đầu tiên',  'percent',  10,    200000, 500,  142, '2026-06-30'::timestamptz, 'active'),
      ('FREESHIP',  'Miễn phí giao hàng toàn quốc','shipping', 30000, 0,      1000, 89,  '2026-05-15'::timestamptz, 'active'),
      ('VIP50K',    'Giảm 50K cho khách VIP',     'fixed',    50000, 500000, 100,  23,  '2026-12-31'::timestamptz, 'active'),
      ('TET2026',   'Sale Tết Bính Ngọ — 20%',    'percent',  20,    300000, 200,  0,   '2026-02-15'::timestamptz, 'scheduled');
  end if;

  if not exists (select 1 from public.banners limit 1) then
    -- image_url is required by the existing banners schema, supply a placeholder.
    insert into public.banners (title, subtitle, image_url, cover_gradient, placement, status, starts_at, ends_at, display_order) values
      ('Bộ sưu tập Xuân-Hè 2026',
       'Toner & Serum mới — phù hợp da nhạy cảm',
       '/banners/placeholder-spring.svg',
       'linear-gradient(135deg, #d4f1d4 0%, #a8e6a8 100%)',
       'home_hero', 'active', '2026-04-01'::timestamptz, '2026-06-30'::timestamptz, 1),
      ('Quà tặng tháng 5',
       'Mua 2 tặng 1 — Sữa rửa mặt thuần chay',
       '/banners/placeholder-may.svg',
       'linear-gradient(135deg, #ffe4b5 0%, #ffc99e 100%)',
       'home_sub', 'scheduled', '2026-05-01'::timestamptz, '2026-05-31'::timestamptz, 2),
      ('Routine 7 bước cho Gen Z',
       'Blog story — Edu content',
       '/banners/placeholder-blog.svg',
       'linear-gradient(135deg, #e0d4ff 0%, #c8b6ff 100%)',
       'blog_index', 'draft', null, null, 3);
  end if;
end $$;
