-- VeganGlow atomic checkout — replaces the racy "create order, then loop
-- decrement_stock" flow in apps/web/src/app/actions/checkout.ts with a single
-- transaction. Validates stock under FOR UPDATE row locks, inserts order +
-- order_items, decrements stock; any RAISE rolls everything back.

create or replace function public.decrement_stock_and_create_order(
  p_customer       jsonb,    -- name, phone, email, address, ward, ward_code,
                             -- province, province_code, note (all text)
  p_items          jsonb,    -- [{ "id": uuid-text, "quantity": int }, ...]
  p_payment_method text
) returns table(order_id uuid, order_code text, total_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_code     text;
  v_order_id uuid;
  v_total    numeric(12,2) := 0;
  v_product  record;
begin
  if p_payment_method not in ('cod', 'card') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = '22023';
  end if;

  -- Materialise items into a temp table; coalesce duplicate ids.
  create temp table _checkout_items (
    product_id uuid primary key,
    quantity   integer not null check (quantity > 0)
  ) on commit drop;

  insert into _checkout_items (product_id, quantity)
  select (e->>'id')::uuid, (e->>'quantity')::integer
  from jsonb_array_elements(p_items) e
  on conflict (product_id) do update
    set quantity = _checkout_items.quantity + excluded.quantity;

  -- Lock product rows in deterministic order to avoid deadlocks; validate stock.
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
    v_total := v_total + v_product.price * v_product.quantity;
  end loop;

  if v_total = 0 then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = '22023';
  end if;

  v_code := 'VG-'
         || upper(to_hex((extract(epoch from now()) * 1000)::bigint))
         || '-'
         || upper(to_hex((random() * 65535)::int));

  insert into public.orders (
    code, user_id, customer_name, phone, email, address,
    city, ward, ward_code, province, province_code, note,
    payment_method, total_amount
  ) values (
    v_code, v_user_id,
    p_customer->>'name',
    p_customer->>'phone',
    p_customer->>'email',
    p_customer->>'address',
    p_customer->>'province',
    p_customer->>'ward',
    p_customer->>'ward_code',
    p_customer->>'province',
    p_customer->>'province_code',
    nullif(p_customer->>'note', ''),
    p_payment_method, v_total
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

  return query select v_order_id, v_code, v_total;
end $$;

revoke all on function public.decrement_stock_and_create_order(jsonb, jsonb, text) from public;
grant execute on function public.decrement_stock_and_create_order(jsonb, jsonb, text)
  to anon, authenticated, service_role;
