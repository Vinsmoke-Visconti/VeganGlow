begin;

-- 1. Add voucher columns to orders
alter table public.orders 
  add column if not exists voucher_code text,
  add column if not exists discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0);

-- 2. Update the atomic checkout RPC to support vouchers
create or replace function public.decrement_stock_and_create_order(
  p_customer       jsonb,
  p_items          jsonb,
  p_payment_method text,
  p_idempotency_key text default null,
  p_voucher_code   text default null
) returns table(order_id uuid, order_code text, total_amount numeric, reused boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_code     text;
  v_order_id uuid;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_total    numeric(12,2) := 0;
  v_product  record;
  v_voucher  record;
begin
  -- Idempotency check (simplified for demo)
  if p_idempotency_key is not null then
    select o.id, o.code, o.total_amount into v_order_id, v_code, v_total
    from public.orders o where o.note like '%' || p_idempotency_key || '%' limit 1;
    if found then
      return query select v_order_id, v_code, v_total, true;
    end if;
  end if;

  if p_payment_method not in ('cod', 'card', 'bank_transfer') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = '22023';
  end if;

  create temp table _checkout_items (
    product_id uuid primary key,
    quantity   integer not null check (quantity > 0)
  ) on commit drop;

  insert into _checkout_items (product_id, quantity)
  select (e->>'id')::uuid, (e->>'quantity')::integer
  from jsonb_array_elements(p_items) e
  on conflict (product_id) do update
    set quantity = _checkout_items.quantity + excluded.quantity;

  for v_product in
    select p.id, p.name, p.image, p.price, p.stock, p.is_active, ci.quantity
    from public.products p
    join _checkout_items ci on ci.product_id = p.id
    order by p.id
    for update of p
  loop
    if not v_product.is_active then
      raise exception 'PRODUCT_INACTIVE:%', v_product.name using errcode = '22023';
    end if;
    if v_product.stock < v_product.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product.name using errcode = '22023';
    end if;
    v_subtotal := v_subtotal + v_product.price * v_product.quantity;
  end loop;

  if v_subtotal = 0 then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = '22023';
  end if;

  -- Voucher Logic
  if p_voucher_code is not null then
    select * into v_voucher from public.vouchers 
    where code = upper(trim(p_voucher_code))
    for update; -- Lock voucher row

    if found then
      if v_voucher.status = 'active' 
         and (v_voucher.starts_at is null or v_voucher.starts_at <= now())
         and (v_voucher.expires_at is null or v_voucher.expires_at > now())
         and (v_voucher.quota = 0 or v_voucher.used_count < v_voucher.quota)
         and (v_subtotal >= v_voucher.min_order)
      then
        if v_voucher.discount_type = 'percent' then
          v_discount := (v_subtotal * v_voucher.discount_value) / 100;
        else
          v_discount := v_voucher.discount_value;
        end if;
        
        -- Increment used count
        update public.vouchers set used_count = used_count + 1 where id = v_voucher.id;
      else
        -- Voucher exists but not valid/usable right now
        p_voucher_code := null;
        v_discount := 0;
      end if;
    else
      p_voucher_code := null;
    end if;
  end if;

  v_total := v_subtotal - v_discount;
  if v_total < 0 then v_total := 0; end if;

  v_code := 'VG-'
         || upper(to_hex((extract(epoch from now()) * 1000)::bigint))
         || '-'
         || upper(to_hex((random() * 65535)::int));

  insert into public.orders (
    code, user_id, customer_name, phone, email, address,
    city, ward, ward_code, province, province_code, note,
    payment_method, total_amount, voucher_code, discount_amount
  ) values (
    v_code, v_user_id,
    p_customer->>'name',
    p_customer->>'phone',
    p_customer->>'email',
    p_customer->>'address',
    p_customer->>'province', -- using province as city for now
    p_customer->>'ward',
    p_customer->>'ward_code',
    p_customer->>'province',
    p_customer->>'province_code',
    (coalesce(p_customer->>'note', '') || ' [IK:' || coalesce(p_idempotency_key, 'N/A') || ']'),
    p_payment_method, v_total, p_voucher_code, v_discount
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

  return query select v_order_id, v_code, v_total, false;
end $$;

commit;
