-- VeganGlow Admin Storage Buckets
-- Provision public-read buckets for product and banner images.

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('banner-images', 'banner-images', true)
on conflict (id) do nothing;

-- Public read for both buckets
drop policy if exists "Public read product-images" on storage.objects;
create policy "Public read product-images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "Public read banner-images" on storage.objects;
create policy "Public read banner-images" on storage.objects
  for select using (bucket_id = 'banner-images');

-- Admin write to both buckets
drop policy if exists "Admin write product-images" on storage.objects;
create policy "Admin write product-images" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admin update product-images" on storage.objects;
create policy "Admin update product-images" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admin delete product-images" on storage.objects;
create policy "Admin delete product-images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admin write banner-images" on storage.objects;
create policy "Admin write banner-images" on storage.objects
  for insert with check (bucket_id = 'banner-images' and public.is_admin());

drop policy if exists "Admin update banner-images" on storage.objects;
create policy "Admin update banner-images" on storage.objects
  for update using (bucket_id = 'banner-images' and public.is_admin());

drop policy if exists "Admin delete banner-images" on storage.objects;
create policy "Admin delete banner-images" on storage.objects
  for delete using (bucket_id = 'banner-images' and public.is_admin());
