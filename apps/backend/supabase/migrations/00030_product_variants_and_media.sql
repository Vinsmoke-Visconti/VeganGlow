-- 00030_product_variants_and_media.sql
-- Purpose: Add product variants (size/color/volume × price/SKU/stock),
--          multi-image gallery, rich-text description.
-- Idempotent.

begin;

-- 1. Rich text description column on products
alter table public.products
  add column if not exists description_html text not null default '',
  add column if not exists short_description text not null default '',
  add column if not exists sku text,
  add column if not exists has_variants boolean not null default false;

create unique index if not exists products_sku_unique
  on public.products(sku) where sku is not null;

-- 2. product_images — multi-image gallery
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  position int not null default 0,
  is_thumbnail boolean not null default false,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx
  on public.product_images(product_id, position);
create unique index if not exists product_images_one_thumbnail
  on public.product_images(product_id) where is_thumbnail = true;

alter table public.product_images enable row level security;

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active = true
    )
  );

drop policy if exists product_images_staff_read on public.product_images;
create policy product_images_staff_read on public.product_images
  for select using (public.is_staff());

drop policy if exists product_images_staff_write on public.product_images;
create policy product_images_staff_write on public.product_images
  for all using (
    public.is_super_admin()
    or public.has_permission('products', 'update')
    or public.has_permission('products', 'create')
  )
  with check (
    public.is_super_admin()
    or public.has_permission('products', 'update')
    or public.has_permission('products', 'create')
  );

-- 3. product_variants — size/color/volume combinations
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null,
  name text not null, -- e.g. "Tubing 50ml / Red"
  attributes jsonb not null default '{}'::jsonb, -- {"size":"M","color":"red","volume":"50ml"}
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  stock int not null default 0 check (stock >= 0),
  image_url text,
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists product_variants_sku_unique
  on public.product_variants(sku);
create index if not exists product_variants_product_idx
  on public.product_variants(product_id, position);
create index if not exists product_variants_attrs_gin
  on public.product_variants using gin (attributes jsonb_path_ops);

-- updated_at trigger
create or replace function public.bump_product_variants_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists product_variants_updated_at on public.product_variants;
create trigger product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.bump_product_variants_updated_at();

alter table public.product_variants enable row level security;

drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants
  for select using (
    is_active = true
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active = true
    )
  );

drop policy if exists product_variants_staff_read on public.product_variants;
create policy product_variants_staff_read on public.product_variants
  for select using (public.is_staff());

drop policy if exists product_variants_staff_write on public.product_variants;
create policy product_variants_staff_write on public.product_variants
  for all using (
    public.is_super_admin()
    or public.has_permission('products', 'update')
    or public.has_permission('products', 'create')
  )
  with check (
    public.is_super_admin()
    or public.has_permission('products', 'update')
    or public.has_permission('products', 'create')
  );

-- 4. order_items: optional variant_id (backwards compatible — null means base product)
alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_snapshot jsonb;

create index if not exists order_items_variant_idx on public.order_items(variant_id);

commit;
