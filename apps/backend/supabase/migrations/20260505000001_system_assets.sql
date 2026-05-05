-- Migration: Manage System Assets and Storage Buckets
-- Created: 2026-05-05

-- 1. Create a dedicated bucket for system assets (backgrounds, logos, hero images)
insert into storage.buckets (id, name, public)
values ('system-assets', 'system-assets', true)
on conflict (id) do nothing;

-- 2. Public read for system-assets
drop policy if exists "Public read system-assets" on storage.objects;
create policy "Public read system-assets" on storage.objects
  for select using (bucket_id = 'system-assets');

-- 3. Admin write for system-assets
drop policy if exists "Admin write system-assets" on storage.objects;
create policy "Admin write system-assets" on storage.objects
  for insert with check (bucket_id = 'system-assets' and public.is_admin());

drop policy if exists "Admin update system-assets" on storage.objects;
create policy "Admin update system-assets" on storage.objects
  for update using (bucket_id = 'system-assets' and public.is_admin());

drop policy if exists "Admin delete system-assets" on storage.objects;
create policy "Admin delete system-assets" on storage.objects
  for delete using (bucket_id = 'system-assets' and public.is_admin());

-- 4. Initialize site_assets in system_settings
insert into public.system_settings (key, value)
values ('site_assets', jsonb_build_object(
  'hero_bg', '',
  'about_bg', '',
  'auth_bg', '',
  'cart_bg', '',
  'contact_bg', '',
  'profile_bg', '',
  'products_bg', '',
  'support_bg', '',
  'wishlist_bg', '',
  'blog_bg', '',
  'cta_bg', '',
  'logo_url', '',
  'logo_light_url', '',
  'footer_logo_url', '',
  'favicon_url', ''
))
on conflict (key) do update set updated_at = now();

-- 5. Update system_settings_read policy to allow public read (needed for storefront)
drop policy if exists system_settings_read on public.system_settings;
create policy system_settings_read on public.system_settings
  for select using (true);
