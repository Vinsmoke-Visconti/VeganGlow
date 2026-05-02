-- ============================================================================
-- Migration: Product Tags (Many-to-Many)
-- ============================================================================
-- Adds a flexible tagging system to products. Tags are independent from
-- categories:
--   - Categories: exclusive (1 per product, primary classification)
--   - Tags: inclusive (many per product, marketing/attribute labels)
--
-- Examples of tags: "Bán chạy", "Mới về", "Thuần chay", "Hữu cơ",
--                   "Da nhạy cảm", "Phiên bản giới hạn"
--
-- A single product like "Kem chống nắng vật lý SPF50+" can be in category
-- "Chống nắng" AND have tags ["Bán chạy", "Da nhạy cảm", "Thuần chay"].
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. tags table
-- ----------------------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text default '',
  color text default '#10b981',           -- hex code for UI badge background
  text_color text default '#ffffff',      -- hex code for badge text
  icon text default '',                   -- optional lucide icon name (e.g. 'sparkles')
  sort_order integer default 0,           -- lower = appears first
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tags_slug_idx on public.tags(slug);
create index if not exists tags_active_idx on public.tags(is_active) where is_active = true;
create index if not exists tags_sort_idx on public.tags(sort_order);

comment on table public.tags is 'Marketing/attribute labels that can be applied to products. Many-to-many with products via product_tags.';
comment on column public.tags.color is 'Hex color for badge background (e.g. #ef4444)';
comment on column public.tags.text_color is 'Hex color for badge text (e.g. #ffffff)';
comment on column public.tags.icon is 'Optional lucide-react icon name (e.g. sparkles, flame, leaf)';
comment on column public.tags.sort_order is 'Display order; lower values appear first';

-- ----------------------------------------------------------------------------
-- 2. product_tags junction table
-- ----------------------------------------------------------------------------
create table if not exists public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (product_id, tag_id)
);

create index if not exists product_tags_product_idx on public.product_tags(product_id);
create index if not exists product_tags_tag_idx on public.product_tags(tag_id);

comment on table public.product_tags is 'Junction table for product <-> tag many-to-many relationship.';

-- ----------------------------------------------------------------------------
-- 3. updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_tags_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tags_updated_at on public.tags;
create trigger trg_tags_updated_at
  before update on public.tags
  for each row execute function public.set_tags_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.tags enable row level security;
alter table public.product_tags enable row level security;

-- tags: public can read active tags; admin/staff full access
drop policy if exists tags_read on public.tags;
create policy tags_read on public.tags
  for select
  using (is_active or public.is_admin());

drop policy if exists tags_write on public.tags;
create policy tags_write on public.tags
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- product_tags: public read (so storefront can show badges); admin/staff write
drop policy if exists product_tags_read on public.product_tags;
create policy product_tags_read on public.product_tags
  for select
  using (true);

drop policy if exists product_tags_write on public.product_tags;
create policy product_tags_write on public.product_tags
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Helper RPC: filter products that have ALL of the given tag slugs (AND)
-- ----------------------------------------------------------------------------
create or replace function public.products_with_all_tags(tag_slugs text[])
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  select pt.product_id
  from public.product_tags pt
  join public.tags t on t.id = pt.tag_id
  where t.slug = any(tag_slugs) and t.is_active
  group by pt.product_id
  having count(distinct t.id) = array_length(tag_slugs, 1);
$$;

comment on function public.products_with_all_tags is 'Returns product_ids that have ALL of the given tag slugs (AND filter). Use OR by passing one slug at a time or using the in-app .in() filter.';

-- ----------------------------------------------------------------------------
-- 6. Helper RPC: filter products that have ANY of the given tag slugs (OR)
-- ----------------------------------------------------------------------------
create or replace function public.products_with_any_tag(tag_slugs text[])
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  select distinct pt.product_id
  from public.product_tags pt
  join public.tags t on t.id = pt.tag_id
  where t.slug = any(tag_slugs) and t.is_active;
$$;

comment on function public.products_with_any_tag is 'Returns product_ids that have ANY of the given tag slugs (OR filter).';

-- ----------------------------------------------------------------------------
-- 7. Seed common tags (idempotent — skipped if already present)
-- ----------------------------------------------------------------------------
insert into public.tags (name, slug, description, color, text_color, icon, sort_order) values
  ('Bán chạy',              'ban-chay',          'Sản phẩm bán chạy nhất',                   '#ef4444', '#ffffff', 'flame',     10),
  ('Mới về',                'moi-ve',            'Sản phẩm mới ra mắt',                      '#3b82f6', '#ffffff', 'sparkles',  20),
  ('Thuần chay',            'thuan-chay',        'Hoàn toàn từ thực vật, không nguồn gốc động vật', '#10b981', '#ffffff', 'leaf',     30),
  ('Hữu cơ',                'huu-co',            'Thành phần hữu cơ chứng nhận',             '#84cc16', '#ffffff', 'sprout',    40),
  ('Phiên bản giới hạn',    'gioi-han',          'Số lượng có hạn, không tái sản xuất',     '#f59e0b', '#ffffff', 'gem',       50),
  ('Da nhạy cảm',           'da-nhay-cam',       'An toàn cho da nhạy cảm, đã test',         '#ec4899', '#ffffff', 'heart',     60),
  ('Không hương liệu',      'khong-huong-lieu',  'Không chứa hương liệu nhân tạo',           '#8b5cf6', '#ffffff', 'circle-off', 70),
  ('Tự nhiên 100%',         'tu-nhien',          'Hoàn toàn từ thiên nhiên',                 '#22c55e', '#ffffff', 'leaf',      80),
  ('Combo tiết kiệm',       'combo',             'Bộ sản phẩm tiết kiệm hơn',                '#06b6d4', '#ffffff', 'package',   90),
  ('Trending',              'trending',          'Đang được quan tâm nhất',                  '#f97316', '#ffffff', 'trending-up', 100)
on conflict (slug) do nothing;

-- ============================================================================
-- Done.
--
-- Next steps (application side):
--   1. Regenerate types:        npm run db:types
--   2. Update ProductCard to render tags from `product.tags`
--   3. Add tag picker to admin product form
--   4. (Optional) Add tag-based filter chips to storefront /products page
--
-- Querying tags from app code:
--
--   // Get a product with its tags:
--   supabase.from('products').select('*, categories(*), tags(*)')
--
--   // Filter by a single tag slug:
--   supabase.from('products')
--     .select('*, tags!inner(*)')
--     .eq('tags.slug', 'ban-chay')
--
--   // Filter by ALL tags (AND):
--   const { data: ids } = await supabase.rpc('products_with_all_tags', {
--     tag_slugs: ['ban-chay', 'thuan-chay']
--   });
--   supabase.from('products').select('*').in('id', ids.map(r => r.product_id))
-- ============================================================================
