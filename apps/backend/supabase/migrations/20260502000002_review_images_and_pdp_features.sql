-- ============================================================================
-- Migration: Review Images + PDP Feature Foundations
-- ============================================================================
-- Extends reviews to support customer-uploaded photos and adds helper RPC
-- for fetching the freeship threshold from system_settings.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. reviews: add images column (array of {url, alt})
-- ----------------------------------------------------------------------------
alter table public.reviews
  add column if not exists images jsonb default '[]'::jsonb,
  add column if not exists is_verified_purchase boolean default false,
  add column if not exists helpful_count integer default 0;

comment on column public.reviews.images is 'Array of {url:text, alt?:text} for customer-uploaded review photos. Public-readable, owner-writable.';
comment on column public.reviews.is_verified_purchase is 'True if the user actually bought this product (computed at insert time from order_items).';
comment on column public.reviews.helpful_count is 'How many other users marked this review as helpful.';

-- Validation trigger: ensure images is an array of objects with a url field, max 6 images
create or replace function public.validate_review_images()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  img jsonb;
  cnt integer;
begin
  if new.images is null then
    new.images := '[]'::jsonb;
    return new;
  end if;
  if jsonb_typeof(new.images) <> 'array' then
    raise exception 'reviews.images must be a JSON array';
  end if;
  cnt := jsonb_array_length(new.images);
  if cnt > 6 then
    raise exception 'reviews.images: maximum 6 images per review (got %)', cnt;
  end if;
  for img in select * from jsonb_array_elements(new.images)
  loop
    if jsonb_typeof(img) <> 'object' then
      raise exception 'reviews.images: each item must be an object with a url field';
    end if;
    if not (img ? 'url') or jsonb_typeof(img->'url') <> 'string' then
      raise exception 'reviews.images: each item requires a string "url" field';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_validate_review_images on public.reviews;
create trigger trg_validate_review_images
  before insert or update on public.reviews
  for each row execute function public.validate_review_images();

-- ----------------------------------------------------------------------------
-- 2. RPC: mark review as verified purchase if user has a paid order containing this product
-- ----------------------------------------------------------------------------
create or replace function public.compute_review_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only compute on insert; updates preserve the value
  if (TG_OP = 'INSERT') then
    new.is_verified_purchase := exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = new.product_id
        and o.user_id = new.user_id
        and o.status in ('completed', 'delivered', 'paid', 'shipped')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_compute_review_verified on public.reviews;
create trigger trg_compute_review_verified
  before insert on public.reviews
  for each row execute function public.compute_review_verified();

-- ----------------------------------------------------------------------------
-- 3. Public RPC: get freeship threshold (cached, fast read for storefront)
-- ----------------------------------------------------------------------------
create or replace function public.get_freeship_threshold()
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select (value->>'freeship_threshold_vnd')::numeric
      from public.system_settings
      where key = 'shipping_config'
      limit 1
    ),
    500000
  );
$$;

comment on function public.get_freeship_threshold is 'Returns the VND threshold above which orders qualify for free shipping. Defaults to 500,000 if not set.';

-- ----------------------------------------------------------------------------
-- 4. Storage bucket for review photos (idempotent)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  true,
  3145728, -- 3 MB per file
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Public can read review photos
drop policy if exists "review_photos_public_read" on storage.objects;
create policy "review_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'review-photos');

-- Authenticated users can upload to their own folder (auth.uid()/...)
drop policy if exists "review_photos_owner_write" on storage.objects;
create policy "review_photos_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can delete their own photos
drop policy if exists "review_photos_owner_delete" on storage.objects;
create policy "review_photos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can manage everything
drop policy if exists "review_photos_admin_all" on storage.objects;
create policy "review_photos_admin_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'review-photos' and public.is_admin())
  with check (bucket_id = 'review-photos' and public.is_admin());

-- ============================================================================
-- Done. Next steps in app code:
--   1. Run npm run db:types to regenerate types
--   2. Customer review form: upload photos to review-photos/<userId>/<filename>
--      then submit review with images: [{url: publicUrl, alt: ''}]
--   3. ReviewsSection: render images grid below comment text
-- ============================================================================
