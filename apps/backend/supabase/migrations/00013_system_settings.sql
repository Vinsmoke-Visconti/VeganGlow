-- VeganGlow System settings — key-value store for brand info, payment, shipping, etc.
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.system_settings enable row level security;

drop policy if exists system_settings_read on public.system_settings;
create policy system_settings_read on public.system_settings
  for select using (public.is_admin());

drop policy if exists system_settings_write on public.system_settings;
create policy system_settings_write on public.system_settings
  for all using (public.is_admin())
  with check (public.is_admin());

-- Seed default brand info row so admin can edit instead of creating from empty
insert into public.system_settings (key, value)
values ('brand_info', jsonb_build_object(
  'name', 'VeganGlow',
  'tagline', 'Mỹ phẩm thuần chay Việt Nam',
  'logo_url', '',
  'contact_email', '',
  'contact_phone', '',
  'address', ''
))
on conflict (key) do nothing;
