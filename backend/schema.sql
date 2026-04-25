-- VeganGlow schema — run in Supabase SQL editor (order matters).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

-- ============== EXTENSIONS ==============
create extension if not exists "pgcrypto";

-- ============== PROFILES ==============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ============== CATEGORIES ==============
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ============== PRODUCTS ==============
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price numeric(12,2) not null check (price >= 0),
  category_id uuid references public.categories(id) on delete set null,
  image text not null default '',
  rating numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  reviews_count integer not null default 0,
  description text not null default '',
  ingredients text not null default '',
  stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_name_idx on public.products(name);

-- ============== ADDRESSES ==============
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============== ORDERS ==============
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  payment_method text not null check (payment_method in ('cod', 'card')),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending','confirmed','shipping','completed','cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_image text not null default '',
  unit_price numeric(12,2) not null,
  quantity integer not null check (quantity > 0)
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- ============== REVIEWS ==============
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

-- Keep products.rating / reviews_count in sync.
create or replace function public.refresh_product_rating(pid uuid)
returns void language plpgsql as $$
begin
  update public.products
    set rating = coalesce((select avg(rating)::numeric(3,2) from public.reviews where product_id = pid), 0),
        reviews_count = (select count(*) from public.reviews where product_id = pid)
  where id = pid;
end $$;

create or replace function public.on_review_changed()
returns trigger language plpgsql as $$
begin
  perform public.refresh_product_rating(coalesce(new.product_id, old.product_id));
  return coalesce(new, old);
end $$;

drop trigger if exists reviews_refresh on public.reviews;
create trigger reviews_refresh
after insert or update or delete on public.reviews
for each row execute procedure public.on_review_changed();

-- ============== FAVORITES ==============
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ============== RLS ==============
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;

-- helper: is current user an admin?
create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles: users see/update own row; admins see all
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (auth.uid() = id);

-- categories: public read, admin write
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- products: public read (active), admin all
drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (is_active or public.is_admin());
drop policy if exists products_write on public.products;
create policy products_write on public.products for all using (public.is_admin()) with check (public.is_admin());

-- addresses: owner only
drop policy if exists addresses_owner on public.addresses;
create policy addresses_owner on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders: owner read/create own, admin all
drop policy if exists orders_read_own on public.orders;
create policy orders_read_own on public.orders for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists orders_insert_any on public.orders;
create policy orders_insert_any on public.orders for insert with check (user_id is null or user_id = auth.uid());
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items for select using (
  exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
);
drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items for insert with check (
  exists(select 1 from public.orders o where o.id = order_id and (o.user_id is null or o.user_id = auth.uid()))
);

-- reviews: public read, owner write
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (true);
drop policy if exists reviews_write on public.reviews;
create policy reviews_write on public.reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- favorites: owner only
drop policy if exists favorites_owner on public.favorites;
create policy favorites_owner on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
