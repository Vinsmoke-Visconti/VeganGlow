-- VeganGlow Flash sales — limited-time product discounts managed by admin
create table if not exists public.flash_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent < 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'scheduled'
    check (status in ('scheduled','active','expired','draft')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists flash_sales_product_idx on public.flash_sales(product_id);
create index if not exists flash_sales_period_idx on public.flash_sales(starts_at, ends_at);
create index if not exists flash_sales_status_idx on public.flash_sales(status);

alter table public.flash_sales enable row level security;

drop policy if exists flash_sales_read on public.flash_sales;
create policy flash_sales_read on public.flash_sales
  for select using (true);

drop policy if exists flash_sales_write on public.flash_sales;
create policy flash_sales_write on public.flash_sales
  for all using (public.is_admin())
  with check (public.is_admin());
