-- Fix missing search_path
create or replace function private.create_checkout_order(
  p_customer         jsonb,
  p_items            jsonb,
  p_payment_method   text,
  p_idempotency_key  text default null
) returns table(order_id uuid, order_code text, total_amount numeric, reused boolean)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
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
  v_payment_method  text := case
    when p_payment_method = 'card' then 'bank_transfer'
    else p_payment_method
  end;
begin
  if v_payment_method not in ('cod', 'bank_transfer') then
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
        'payment_method', v_payment_method
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
    payment_method, payment_status, payment_due_at, total_amount
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
    v_payment_method,
    case when v_payment_method = 'bank_transfer' then 'pending' else 'unpaid' end,
    case when v_payment_method = 'bank_transfer' then now() + interval '15 minutes' else null end,
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
