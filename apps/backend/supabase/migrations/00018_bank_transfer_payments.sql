-- VeganGlow bank-transfer payment hardening.
-- Orders paid by VietQR/MB stay pending until a signed bank webhook records
-- a real transaction that matches account, amount, and order code.

create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

alter table public.orders
  drop constraint if exists orders_payment_method_check;

update public.orders
   set payment_method = 'bank_transfer'
 where payment_method = 'card';

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'bank_transfer', 'card'));

alter table public.orders
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_due_at timestamptz;

alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));

update public.orders
   set payment_status = case
     when payment_method in ('bank_transfer', 'card')
          and status in ('confirmed', 'shipping', 'completed') then 'paid'
     when payment_method in ('bank_transfer', 'card') then 'pending'
     when payment_method = 'cod'
          and status = 'completed' then 'paid'
     else payment_status
   end
 where payment_status = 'unpaid';

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_transaction_id text not null,
  bank_id text not null,
  account_number text not null,
  account_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'VND',
  transfer_content text not null,
  matched_order_id uuid references public.orders(id) on delete set null,
  matched_order_code text,
  status text not null default 'received'
    check (status in ('received', 'matched', 'duplicate', 'rejected', 'manual_review')),
  raw_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  paid_at timestamptz,
  processed_at timestamptz,
  unique (provider, provider_transaction_id)
);

alter table public.payment_transactions enable row level security;

revoke all on public.payment_transactions from anon, authenticated;
grant select on public.payment_transactions to authenticated;

drop policy if exists payment_transactions_read_staff_or_owner on public.payment_transactions;
create policy payment_transactions_read_staff_or_owner
  on public.payment_transactions
  for select
  using (
    public.has_permission('orders', 'read')
    or public.is_super_admin()
    or exists (
      select 1
      from public.orders o
      where o.id = matched_order_id
        and o.user_id = auth.uid()
    )
  );

create index if not exists payment_transactions_order_idx
  on public.payment_transactions(matched_order_id);
create index if not exists payment_transactions_status_idx
  on public.payment_transactions(status, received_at desc);
create index if not exists orders_payment_status_idx
  on public.orders(payment_status, payment_due_at);

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

drop function if exists public.confirm_bank_transfer_payment(text, text, text, text, text, numeric, text, text, timestamptz, jsonb);
drop function if exists private.confirm_bank_transfer_payment(text, text, text, text, text, numeric, text, text, timestamptz, jsonb);

create or replace function private.confirm_bank_transfer_payment(
  p_provider                text,
  p_provider_transaction_id text,
  p_bank_id                 text,
  p_account_number          text,
  p_account_name            text,
  p_amount                  numeric,
  p_currency                text,
  p_transfer_content        text,
  p_paid_at                 timestamptz default null,
  p_raw_payload             jsonb default '{}'::jsonb
) returns table(
  order_id uuid,
  order_code text,
  transaction_id uuid,
  payment_status text,
  order_status text,
  matched boolean,
  reused boolean,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_provider        text := lower(coalesce(nullif(trim(p_provider), ''), 'bank-webhook'));
  v_txn_ref         text := nullif(trim(p_provider_transaction_id), '');
  v_bank_id         text := upper(regexp_replace(coalesce(p_bank_id, ''), '[^A-Za-z0-9]', '', 'g'));
  v_account_number  text := regexp_replace(coalesce(p_account_number, ''), '[^0-9]', '', 'g');
  v_account_name    text := upper(regexp_replace(trim(coalesce(p_account_name, '')), '[[:space:]]+', ' ', 'g'));
  v_currency        text := upper(coalesce(nullif(trim(p_currency), ''), 'VND'));
  v_content         text := trim(coalesce(p_transfer_content, ''));
  v_order_code      text;
  v_order           public.orders%rowtype;
  v_tx              public.payment_transactions%rowtype;
  v_tx_id           uuid;
  v_paid_at         timestamptz := coalesce(p_paid_at, now());
begin
  if v_txn_ref is null then
    raise exception 'MISSING_TRANSACTION_ID' using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;

  insert into public.payment_transactions (
    provider, provider_transaction_id, bank_id, account_number, account_name,
    amount, currency, transfer_content, raw_payload, paid_at
  ) values (
    v_provider, v_txn_ref, v_bank_id, v_account_number, v_account_name,
    p_amount, v_currency, v_content, coalesce(p_raw_payload, '{}'::jsonb), v_paid_at
  )
  on conflict (provider, provider_transaction_id) do nothing
  returning * into v_tx;

  if not found then
    select * into v_tx
    from public.payment_transactions
    where provider = v_provider
      and provider_transaction_id = v_txn_ref;

    return query
    select
      v_tx.matched_order_id,
      v_tx.matched_order_code,
      v_tx.id,
      o.payment_status,
      o.status,
      v_tx.matched_order_id is not null,
      true,
      'DUPLICATE_WEBHOOK'
    from (select 1) s
    left join public.orders o on o.id = v_tx.matched_order_id;
    return;
  end if;

  v_tx_id := v_tx.id;

  if v_bank_id not in ('MB', 'MBBANK')
     or v_account_number <> '2111122227777'
     or (v_account_name <> '' and v_account_name <> 'PHAM HOAI THUONG') then
    update public.payment_transactions
       set status = 'rejected', processed_at = now()
     where id = v_tx_id
     returning * into v_tx;

    return query select null::uuid, null::text, v_tx_id, null::text, null::text, false, false, 'INVALID_DESTINATION_ACCOUNT';
    return;
  end if;

  v_order_code := (regexp_match(upper(v_content), '(VG-[A-F0-9]+-[A-F0-9]+)'))[1];

  if v_order_code is null then
    update public.payment_transactions
       set status = 'manual_review', processed_at = now()
     where id = v_tx_id;

    return query select null::uuid, null::text, v_tx_id, null::text, null::text, false, false, 'ORDER_CODE_NOT_FOUND';
    return;
  end if;

  select * into v_order
  from public.orders
  where code = v_order_code
  for update;

  if not found then
    update public.payment_transactions
       set status = 'manual_review',
           matched_order_code = v_order_code,
           processed_at = now()
     where id = v_tx_id;

    return query select null::uuid, v_order_code, v_tx_id, null::text, null::text, false, false, 'ORDER_NOT_FOUND';
    return;
  end if;

  update public.payment_transactions
     set matched_order_id = v_order.id,
         matched_order_code = v_order.code
   where id = v_tx_id;

  if v_order.payment_method not in ('bank_transfer', 'card') then
    update public.payment_transactions
       set status = 'manual_review', processed_at = now()
     where id = v_tx_id;

    return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'ORDER_NOT_BANK_TRANSFER';
    return;
  end if;

  if v_order.status = 'cancelled' then
    update public.payment_transactions
       set status = 'manual_review', processed_at = now()
     where id = v_tx_id;

    return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'ORDER_CANCELLED';
    return;
  end if;

  if p_amount <> v_order.total_amount then
    update public.payment_transactions
       set status = 'manual_review', processed_at = now()
     where id = v_tx_id;

    return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'AMOUNT_MISMATCH';
    return;
  end if;

  if v_order.payment_status = 'paid' then
    update public.payment_transactions
       set status = 'manual_review', processed_at = now()
     where id = v_tx_id;

    return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'ORDER_ALREADY_PAID';
    return;
  end if;

  perform set_config('veganglow.payment_confirm_context', 'bank_webhook', true);

  update public.orders
     set payment_status = 'paid',
         payment_reference = v_txn_ref,
         paid_at = v_paid_at,
         status = case when status = 'pending' then 'confirmed' else status end
   where id = v_order.id
   returning * into v_order;

  update public.payment_transactions
     set status = 'matched', processed_at = now()
   where id = v_tx_id;

  return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'PAYMENT_CONFIRMED';
end $$;

revoke all on function private.confirm_bank_transfer_payment(text, text, text, text, text, numeric, text, text, timestamptz, jsonb) from public;
grant execute on function private.confirm_bank_transfer_payment(text, text, text, text, text, numeric, text, text, timestamptz, jsonb)
  to service_role;

create or replace function public.confirm_bank_transfer_payment(
  p_provider                text,
  p_provider_transaction_id text,
  p_bank_id                 text,
  p_account_number          text,
  p_account_name            text,
  p_amount                  numeric,
  p_currency                text,
  p_transfer_content        text,
  p_paid_at                 timestamptz default null,
  p_raw_payload             jsonb default '{}'::jsonb
) returns table(
  order_id uuid,
  order_code text,
  transaction_id uuid,
  payment_status text,
  order_status text,
  matched boolean,
  reused boolean,
  message text
)
language sql
set search_path = public
as $$
  select *
  from private.confirm_bank_transfer_payment(
    p_provider,
    p_provider_transaction_id,
    p_bank_id,
    p_account_number,
    p_account_name,
    p_amount,
    p_currency,
    p_transfer_content,
    p_paid_at,
    p_raw_payload
  );
$$;

revoke all on function public.confirm_bank_transfer_payment(text, text, text, text, text, numeric, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_bank_transfer_payment(text, text, text, text, text, numeric, text, text, timestamptz, jsonb)
  to service_role;

create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
as $$
begin
  if old.payment_status is distinct from new.payment_status
     and new.payment_status = 'paid'
     and coalesce(current_setting('veganglow.payment_confirm_context', true), '') <> 'bank_webhook' then
    raise exception 'PAYMENT_STATUS_LOCKED' using errcode = '42501';
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.payment_method in ('bank_transfer', 'card')
     and new.status in ('confirmed', 'shipping', 'completed')
     and coalesce(new.payment_status, old.payment_status) <> 'paid' then
    raise exception 'PAYMENT_NOT_CONFIRMED' using errcode = '22023';
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
  before update of status, payment_status on public.orders
  for each row execute procedure public.enforce_order_status_transition();

create or replace function private.cancel_expired_bank_transfer_orders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  update public.orders
     set status = 'cancelled',
         payment_status = 'failed'
   where payment_method in ('bank_transfer', 'card')
     and payment_status = 'pending'
     and status = 'pending'
     and payment_due_at is not null
     and payment_due_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function private.cancel_expired_bank_transfer_orders() from public;
grant execute on function private.cancel_expired_bank_transfer_orders() to service_role;

create or replace function public.cancel_expired_bank_transfer_orders()
returns integer
language sql
set search_path = public
as $$ select private.cancel_expired_bank_transfer_orders(); $$;

revoke all on function public.cancel_expired_bank_transfer_orders() from public, anon, authenticated;
grant execute on function public.cancel_expired_bank_transfer_orders() to service_role;
