-- 00033_shipping_and_brand.sql
-- Purpose: Per-province shipping rates + freeship threshold + brand info.
--          Public read for storefront pricing logic.

begin;

-- 1. Shipping rates per province (Vietnam — 63 tỉnh/thành)
create table if not exists public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  province_code text not null unique, -- e.g. 'HN', 'HCM', 'DN'
  province_name text not null,
  base_fee numeric(12,2) not null check (base_fee >= 0),
  per_kg_fee numeric(12,2) not null default 0 check (per_kg_fee >= 0),
  estimated_days int not null default 3,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shipping_rates_province_idx on public.shipping_rates(province_code);

create or replace function public.bump_shipping_rates_updated_at()
returns trigger language plpgsql security invoker
set search_path = public, pg_temp
as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists shipping_rates_updated on public.shipping_rates;
create trigger shipping_rates_updated before update on public.shipping_rates
  for each row execute function public.bump_shipping_rates_updated_at();

alter table public.shipping_rates enable row level security;

drop policy if exists shipping_rates_public_read on public.shipping_rates;
create policy shipping_rates_public_read on public.shipping_rates
  for select using (is_active = true);

drop policy if exists shipping_rates_admin_write on public.shipping_rates;
create policy shipping_rates_admin_write on public.shipping_rates
  for all using (
    public.is_super_admin()
    or public.has_permission('settings', 'update')
  )
  with check (
    public.is_super_admin()
    or public.has_permission('settings', 'update')
  );

-- 2. Seed common Vietnam provinces with reasonable defaults
insert into public.shipping_rates (province_code, province_name, base_fee, per_kg_fee, estimated_days) values
  ('HN',  'Hà Nội',                30000, 5000, 2),
  ('HCM', 'TP. Hồ Chí Minh',       30000, 5000, 2),
  ('DN',  'Đà Nẵng',               40000, 7000, 3),
  ('HP',  'Hải Phòng',             35000, 5000, 3),
  ('CT',  'Cần Thơ',               45000, 8000, 4),
  ('NT',  'Nha Trang (Khánh Hòa)', 50000, 8000, 4),
  ('OTHER', 'Tỉnh/thành khác',     60000, 10000, 5)
on conflict (province_code) do nothing;

-- 3. Brand & shipping config in system_settings (key-value JSONB)
-- Storefront reads these via RPC get_public_settings
insert into public.system_settings (key, value) values
  ('brand', '{
    "name": "VeganGlow",
    "tagline": "Mỹ phẩm thuần chay Việt Nam",
    "logo_url": "/logo.jpg",
    "favicon_url": "/favicon.ico",
    "hotline": "1900 1234",
    "email": "hello@veganglow.com",
    "address": "Tầng 3, 123 Hai Bà Trưng, Q.1, TP.HCM",
    "social": {
      "facebook": "https://facebook.com/veganglow",
      "instagram": "https://instagram.com/veganglow",
      "tiktok": "https://tiktok.com/@veganglow",
      "youtube": ""
    }
  }'::jsonb),
  ('shipping_config', '{
    "freeship_threshold_vnd": 500000,
    "default_weight_kg": 0.3,
    "currency": "VND",
    "estimated_processing_hours": 24
  }'::jsonb)
on conflict (key) do nothing;

-- 4. Public RPC to read non-sensitive settings (anon can call)
create or replace function public.get_public_settings()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_object_agg(key, value)
  from public.system_settings
  where key in ('brand', 'shipping_config')
$$;

grant execute on function public.get_public_settings() to anon, authenticated;

-- 5. Shipping fee calculator RPC (public — used by checkout)
create or replace function public.calculate_shipping_fee(
  p_province_code text,
  p_subtotal numeric,
  p_weight_kg numeric default 0.3
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_rate record;
  v_threshold numeric;
  v_fee numeric;
  v_freeship boolean := false;
begin
  select * into v_rate from public.shipping_rates
    where (province_code = p_province_code or province_code = 'OTHER')
    and is_active = true
    order by case when province_code = p_province_code then 0 else 1 end
    limit 1;

  if v_rate is null then
    return jsonb_build_object('fee', 0, 'estimated_days', 5, 'freeship', false, 'error', 'no_rate');
  end if;

  select (value->>'freeship_threshold_vnd')::numeric into v_threshold
    from public.system_settings where key = 'shipping_config';

  v_fee := v_rate.base_fee + greatest(0, p_weight_kg - 1) * v_rate.per_kg_fee;

  if v_threshold is not null and p_subtotal >= v_threshold then
    v_freeship := true;
    v_fee := 0;
  end if;

  return jsonb_build_object(
    'fee', v_fee,
    'estimated_days', v_rate.estimated_days,
    'province_name', v_rate.province_name,
    'freeship', v_freeship,
    'freeship_threshold', v_threshold
  );
end $$;

grant execute on function public.calculate_shipping_fee(text, numeric, numeric) to anon, authenticated;

commit;
