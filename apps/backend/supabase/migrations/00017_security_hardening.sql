-- VeganGlow security hardening.
-- - Move privileged checkout work out of the exposed public schema.
-- - Add checkout idempotency to prevent duplicate orders/payments.
-- - Deny direct client order/order_item inserts; checkout must use RPC.
-- - Tighten admin RLS from "any staff" to explicit RBAC permissions.
-- - Enforce legal order status transitions and restock cancelled orders.
-- - Add indexes for common product filters/searches.

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create table if not exists public.checkout_idempotency_keys (
  key text primary key,
  user_id uuid references auth.users(id) on delete set null,
  request_hash text not null,
  order_id uuid references public.orders(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.checkout_idempotency_keys enable row level security;

create index if not exists checkout_idempotency_order_idx
  on public.checkout_idempotency_keys(order_id);
create index if not exists checkout_idempotency_created_idx
  on public.checkout_idempotency_keys(created_at);

drop function if exists public.decrement_stock_and_create_order(jsonb, jsonb, text);
drop function if exists public.decrement_stock_and_create_order(jsonb, jsonb, text, text);
drop function if exists private.create_checkout_order(jsonb, jsonb, text, text);

create or replace function private.create_checkout_order(
  p_customer         jsonb,
  p_items            jsonb,
  p_payment_method   text,
  p_idempotency_key  text default null
) returns table(order_id uuid, order_code text, total_amount numeric, reused boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id         uuid := auth.uid();
  v_code            text;
  v_order_id        uuid;
  v_total           numeric(12,2) := 0;
  v_product         record;
  v_expected_items  integer := 0;
  v_locked_items    integer := 0;
  v_request_hash    text;
  v_key             text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_inserted_key    boolean := false;
  v_existing_key    public.checkout_idempotency_keys%rowtype;
begin
  if p_payment_method not in ('cod', 'card') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023';
  end if;

  if p_customer is null or jsonb_typeof(p_customer) <> 'object' then
    raise exception 'INVALID_CUSTOMER' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_customer->>'name', ''))) < 2
     or length(trim(coalesce(p_customer->>'name', ''))) > 120
     or length(trim(coalesce(p_customer->>'phone', ''))) > 20
     or length(trim(coalesce(p_customer->>'email', ''))) > 200
     or length(trim(coalesce(p_customer->>'address', ''))) < 3
     or length(trim(coalesce(p_customer->>'address', ''))) > 250
     or length(trim(coalesce(p_customer->>'province_code', ''))) = 0
     or length(trim(coalesce(p_customer->>'ward_code', ''))) = 0
     or length(trim(coalesce(p_customer->>'note', ''))) > 500 then
    raise exception 'INVALID_CUSTOMER' using errcode = '22023';
  end if;

  if trim(coalesce(p_customer->>'phone', '')) !~ '^(0|\+84)[0-9]{9,10}$' then
    raise exception 'INVALID_CUSTOMER_PHONE' using errcode = '22023';
  end if;

  if trim(coalesce(p_customer->>'email', '')) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'INVALID_CUSTOMER_EMAIL' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'TOO_MANY_ITEMS' using errcode = '22023';
  end if;

  if v_key is not null and (length(v_key) > 128 or v_key !~ '^[A-Za-z0-9._:-]{16,128}$') then
    raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;

  create temp table _checkout_items (
    product_id uuid primary key,
    quantity   integer not null check (quantity > 0 and quantity <= 999)
  ) on commit drop;

  insert into _checkout_items (product_id, quantity)
  select (e->>'id')::uuid, (e->>'quantity')::integer
  from jsonb_array_elements(p_items) e
  on conflict (product_id) do update
    set quantity = _checkout_items.quantity + excluded.quantity;

  select count(*) into v_expected_items from _checkout_items;
  if v_expected_items = 0 then
    raise exception 'EMPTY_CART' using errcode = '22023';
  end if;

  select encode(
    digest(
      jsonb_build_object(
        'customer', jsonb_build_object(
          'name', trim(p_customer->>'name'),
          'phone', trim(p_customer->>'phone'),
          'email', lower(trim(p_customer->>'email')),
          'address', trim(p_customer->>'address'),
          'ward', trim(p_customer->>'ward'),
          'ward_code', trim(p_customer->>'ward_code'),
          'province', trim(p_customer->>'province'),
          'province_code', trim(p_customer->>'province_code'),
          'note', trim(coalesce(p_customer->>'note', ''))
        ),
        'items', (
          select jsonb_agg(
            jsonb_build_object('id', product_id, 'quantity', quantity)
            order by product_id
          )
          from _checkout_items
        ),
        'payment_method', p_payment_method
      )::text,
      'sha256'
    ),
    'hex'
  ) into v_request_hash;

  if v_key is not null then
    insert into public.checkout_idempotency_keys (key, user_id, request_hash)
    values (v_key, v_user_id, v_request_hash)
    on conflict do nothing
    returning true into v_inserted_key;

    if coalesce(v_inserted_key, false) = false then
      select * into v_existing_key
      from public.checkout_idempotency_keys
      where key = v_key
      for update;

      if not found then
        raise exception 'IDEMPOTENCY_LOOKUP_FAILED' using errcode = '40001';
      end if;

      if v_existing_key.request_hash <> v_request_hash
         or coalesce(v_existing_key.user_id, '00000000-0000-0000-0000-000000000000'::uuid)
            <> coalesce(v_user_id, '00000000-0000-0000-0000-000000000000'::uuid) then
        raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '22023';
      end if;

      if v_existing_key.order_id is null then
        raise exception 'IDEMPOTENCY_IN_PROGRESS' using errcode = '40001';
      end if;

      return query
      select o.id, o.code, o.total_amount, true
      from public.orders o
      where o.id = v_existing_key.order_id;
      return;
    end if;
  end if;

  -- Lock product rows in deterministic order to avoid deadlocks.
  for v_product in
    select p.id, p.name, p.image, p.price, p.stock, p.is_active, ci.quantity
    from public.products p
    join _checkout_items ci on ci.product_id = p.id
    order by p.id
    for update of p
  loop
    v_locked_items := v_locked_items + 1;

    if not v_product.is_active then
      raise exception 'PRODUCT_INACTIVE:%', v_product.name using errcode = '22023';
    end if;

    if v_product.stock < v_product.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product.name using errcode = '22023';
    end if;

    v_total := v_total + v_product.price * v_product.quantity;
  end loop;

  if v_locked_items <> v_expected_items then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = '22023';
  end if;

  v_code := 'VG-'
         || upper(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint))
         || '-'
         || upper(to_hex((random() * 65535)::int));

  insert into public.orders (
    code, user_id, customer_name, phone, email, address,
    city, ward, ward_code, province, province_code, note,
    payment_method, total_amount
  ) values (
    v_code, v_user_id,
    trim(p_customer->>'name'),
    trim(p_customer->>'phone'),
    lower(trim(p_customer->>'email')),
    trim(p_customer->>'address'),
    trim(p_customer->>'province'),
    trim(p_customer->>'ward'),
    trim(p_customer->>'ward_code'),
    trim(p_customer->>'province'),
    trim(p_customer->>'province_code'),
    nullif(trim(coalesce(p_customer->>'note', '')), ''),
    p_payment_method,
    v_total
  ) returning id into v_order_id;

  insert into public.order_items
    (order_id, product_id, product_name, product_image, unit_price, quantity)
  select v_order_id, p.id, p.name, p.image, p.price, ci.quantity
  from public.products p
  join _checkout_items ci on ci.product_id = p.id;

  update public.products p
     set stock = p.stock - ci.quantity
    from _checkout_items ci
   where p.id = ci.product_id;

  if v_key is not null then
    update public.checkout_idempotency_keys
       set order_id = v_order_id
     where key = v_key;
  end if;

  return query select v_order_id, v_code, v_total, false;
end $$;

revoke all on function private.create_checkout_order(jsonb, jsonb, text, text) from public;
grant execute on function private.create_checkout_order(jsonb, jsonb, text, text)
  to anon, authenticated, service_role;

create or replace function public.decrement_stock_and_create_order(
  p_customer         jsonb,
  p_items            jsonb,
  p_payment_method   text,
  p_idempotency_key  text default null
) returns table(order_id uuid, order_code text, total_amount numeric, reused boolean)
language sql
set search_path = public
as $$
  select *
  from private.create_checkout_order(
    p_customer,
    p_items,
    p_payment_method,
    p_idempotency_key
  );
$$;

revoke all on function public.decrement_stock_and_create_order(jsonb, jsonb, text, text) from public;
grant execute on function public.decrement_stock_and_create_order(jsonb, jsonb, text, text)
  to anon, authenticated, service_role;

do $$
begin
  if to_regprocedure('public.decrement_stock(uuid, integer)') is not null then
    revoke execute on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
    grant execute on function public.decrement_stock(uuid, integer) to service_role;
  end if;
end $$;

alter table public.permissions add column if not exists display_name text;
update public.permissions
   set display_name = initcap(module || ' ' || action)
 where display_name is null or display_name = '';
alter table public.permissions alter column display_name set default '';
alter table public.permissions alter column display_name set not null;

with grants(role_name, module, action) as (
  values
    ('product_manager',   'products', 'read'),
    ('product_manager',   'products', 'write'),
    ('product_manager',   'products', 'delete'),
    ('inventory_manager', 'products', 'read'),
    ('inventory_manager', 'products', 'write'),
    ('inventory_manager', 'orders',   'read'),
    ('order_manager',     'orders',   'read'),
    ('order_manager',     'orders',   'write'),
    ('order_manager',     'products', 'read'),
    ('customer_support',  'orders',   'read'),
    ('customer_support',  'users',    'read'),
    ('marketing_manager', 'marketing','read'),
    ('marketing_manager', 'marketing','write'),
    ('marketing_manager', 'products', 'read')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from grants g
join public.roles r on r.name = g.role_name
join public.permissions p on p.module = g.module and p.action = g.action
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'super_admin'
on conflict do nothing;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.staff_profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.staff_profiles sp
    join public.roles r on r.id = sp.role_id
    where sp.id = auth.uid()
      and sp.is_active = true
      and r.name = 'super_admin'
  );
$$;

create or replace function private.has_permission(p_module text, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.staff_profiles sp
    join public.role_permissions rp on rp.role_id = sp.role_id
    join public.permissions p on p.id = rp.permission_id
    where sp.id = auth.uid()
      and sp.is_active = true
      and p.module = p_module
      and p.action = p_action
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
    or private.is_staff();
$$;

revoke all on function private.is_staff() from public;
revoke all on function private.is_super_admin() from public;
revoke all on function private.has_permission(text, text) from public;
revoke all on function private.is_admin() from public;
grant execute on function private.is_staff() to anon, authenticated, service_role;
grant execute on function private.is_super_admin() to anon, authenticated, service_role;
grant execute on function private.has_permission(text, text) to anon, authenticated, service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;

create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = public
as $$ select private.is_staff(); $$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
set search_path = public
as $$ select private.is_super_admin(); $$;

create or replace function public.has_permission(p_module text, p_action text)
returns boolean
language sql
stable
set search_path = public
as $$ select private.has_permission(p_module, p_action); $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$ select private.is_admin(); $$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_super_admin() from public;
revoke all on function public.has_permission(text, text) from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.is_super_admin() to anon, authenticated, service_role;
grant execute on function public.has_permission(text, text) to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles
  for select using (public.is_staff() or public.is_super_admin());

drop policy if exists permissions_read on public.permissions;
create policy permissions_read on public.permissions
  for select using (public.is_staff() or public.is_super_admin());

drop policy if exists role_permissions_read on public.role_permissions;
create policy role_permissions_read on public.role_permissions
  for select using (public.is_staff() or public.is_super_admin());

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (
    auth.uid() = id
    or public.has_permission('users', 'read')
    or public.is_super_admin()
  );

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all using (public.has_permission('products', 'write') or public.is_super_admin())
  with check  (public.has_permission('products', 'write') or public.is_super_admin());

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all using (public.has_permission('products', 'write') or public.is_super_admin())
  with check  (public.has_permission('products', 'write') or public.is_super_admin());

drop policy if exists orders_read_own on public.orders;
create policy orders_read_own on public.orders
  for select using (
    user_id = auth.uid()
    or public.has_permission('orders', 'read')
    or public.is_super_admin()
  );

drop policy if exists orders_insert_any on public.orders;
create policy orders_insert_via_checkout_rpc on public.orders
  for insert with check (false);

drop policy if exists orders_admin_update on public.orders;
create policy orders_update_staff on public.orders
  for update using (public.has_permission('orders', 'write') or public.is_super_admin())
  with check  (public.has_permission('orders', 'write') or public.is_super_admin());

drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items
  for select using (
    exists(
      select 1
      from public.orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or public.has_permission('orders', 'read')
          or public.is_super_admin()
        )
    )
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert_via_checkout_rpc on public.order_items
  for insert with check (false);

drop policy if exists flash_sales_write on public.flash_sales;
create policy flash_sales_write on public.flash_sales
  for all using (public.has_permission('marketing', 'write') or public.is_super_admin())
  with check  (public.has_permission('marketing', 'write') or public.is_super_admin());

drop policy if exists team_members_write on public.team_members;
create policy team_members_write on public.team_members
  for all using (public.has_permission('users', 'write') or public.is_super_admin())
  with check  (public.has_permission('users', 'write') or public.is_super_admin());

drop policy if exists system_settings_read on public.system_settings;
create policy system_settings_read on public.system_settings
  for select using (public.is_super_admin());

drop policy if exists system_settings_write on public.system_settings;
create policy system_settings_write on public.system_settings
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists testimonials_write_staff on public.testimonials;
create policy testimonials_write_staff on public.testimonials
  for all using (public.has_permission('marketing', 'write') or public.is_super_admin())
  with check  (public.has_permission('marketing', 'write') or public.is_super_admin());

drop policy if exists blog_posts_write_staff on public.blog_posts;
create policy blog_posts_write_staff on public.blog_posts
  for all using (public.has_permission('marketing', 'write') or public.is_super_admin())
  with check  (public.has_permission('marketing', 'write') or public.is_super_admin());

drop policy if exists faqs_write_staff on public.faqs;
create policy faqs_write_staff on public.faqs
  for all using (public.has_permission('marketing', 'write') or public.is_super_admin())
  with check  (public.has_permission('marketing', 'write') or public.is_super_admin());

drop policy if exists contact_messages_read_staff on public.contact_messages;
create policy contact_messages_read_staff on public.contact_messages
  for select using (public.has_permission('users', 'read') or public.is_super_admin());

drop policy if exists contact_messages_update_staff on public.contact_messages;
create policy contact_messages_update_staff on public.contact_messages
  for update using (public.has_permission('users', 'write') or public.is_super_admin())
  with check  (public.has_permission('users', 'write') or public.is_super_admin());

drop policy if exists contact_messages_delete_staff on public.contact_messages;
create policy contact_messages_delete_staff on public.contact_messages
  for delete using (public.has_permission('users', 'write') or public.is_super_admin());

create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status = 'pending' and new.status in ('confirmed', 'cancelled') then
    return new;
  elsif old.status = 'confirmed' and new.status in ('shipping', 'cancelled') then
    return new;
  elsif old.status = 'shipping' and new.status = 'completed' then
    return new;
  end if;

  raise exception 'INVALID_ORDER_STATUS_TRANSITION:%->%', old.status, new.status
    using errcode = '22023';
end $$;

drop trigger if exists trg_enforce_order_status_transition on public.orders;
create trigger trg_enforce_order_status_transition
  before update of status on public.orders
  for each row execute procedure public.enforce_order_status_transition();

create or replace function private.apply_order_status_side_effects()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status <> 'cancelled'
     and new.status = 'cancelled'
     and old.status in ('pending', 'confirmed') then
    update public.products p
       set stock = p.stock + oi.quantity
      from public.order_items oi
     where oi.order_id = new.id
       and oi.product_id = p.id;
  end if;

  return new;
end $$;

revoke all on function private.apply_order_status_side_effects() from public;

drop trigger if exists trg_order_status_side_effects on public.orders;
create trigger trg_order_status_side_effects
  after update of status on public.orders
  for each row execute procedure private.apply_order_status_side_effects();

create index if not exists products_active_category_idx
  on public.products(is_active, category_id);
create index if not exists products_active_price_idx
  on public.products(is_active, price);
create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);
create index if not exists products_description_trgm_idx
  on public.products using gin (description gin_trgm_ops);
create index if not exists orders_created_status_idx
  on public.orders(status, created_at desc);
