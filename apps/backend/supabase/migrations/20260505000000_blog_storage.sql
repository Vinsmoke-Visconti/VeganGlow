-- VeganGlow Blog Storage & Image Data
-- Creates a dedicated bucket for blog covers and updates existing posts to use Supabase Storage.

-- 1. Create blog-covers bucket
insert into storage.buckets (id, name, public)
values ('blog-covers', 'blog-covers', true)
on conflict (id) do nothing;

-- 2. Public read for blog-covers
drop policy if exists "Public read blog-covers" on storage.objects;
create policy "Public read blog-covers" on storage.objects
  for select using (bucket_id = 'blog-covers');

-- 3. Admin write for blog-covers
drop policy if exists "Admin write blog-covers" on storage.objects;
create policy "Admin write blog-covers" on storage.objects
  for insert with check (bucket_id = 'blog-covers' and public.is_admin());

drop policy if exists "Admin update blog-covers" on storage.objects;
create policy "Admin update blog-covers" on storage.objects
  for update using (bucket_id = 'blog-covers' and public.is_admin());

drop policy if exists "Admin delete blog-covers" on storage.objects;
create policy "Admin delete blog-covers" on storage.objects
  for delete using (bucket_id = 'blog-covers' and public.is_admin());

-- 4. Update existing posts with expected storage paths
-- Note: The admin will need to upload summer.png, niacinamide.png, ingredients.png 
-- to the 'blog-covers' bucket for these to resolve correctly.
update public.blog_posts
set cover_image = 'blog-covers/summer.png'
where slug in ('bi-quyet-cham-soc-da-mua-he-2026', 'rau-ma-cho-da-mun');

update public.blog_posts
set cover_image = 'blog-covers/niacinamide.png'
where slug in ('niacinamide-thanh-phan-than-ky', 'tra-xanh-chong-oxy-hoa');

update public.blog_posts
set cover_image = 'blog-covers/ingredients.png'
where slug in ('huong-dan-doc-bang-thanh-phan-my-pham-cho-nguoi-moi', 'lam-sao-de-doc-bang-thanh-phan');
