-- VeganGlow — extend orders/addresses with Vietnam administrative fields
-- Source dataset: vietmap-company/vietnam_administrative_address (admin_new — post-2025 reform: 34 provinces + ~3.3k wards/communes)

-- ============== ORDERS ==============
alter table public.orders
  add column if not exists email text,
  add column if not exists ward text,
  add column if not exists ward_code text,
  add column if not exists province text,
  add column if not exists province_code text,
  add column if not exists note text;

-- ============== ADDRESSES (customer book) ==============
alter table public.addresses
  add column if not exists email text,
  add column if not exists ward text,
  add column if not exists ward_code text,
  add column if not exists province text,
  add column if not exists province_code text;

-- ============== PROFILES (CRM contact info) ==============
alter table public.profiles
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists ward text,
  add column if not exists ward_code text,
  add column if not exists province text,
  add column if not exists province_code text;

-- Allow staff to read profiles (for admin/customers CRM page)
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles for select using (public.is_admin());
