-- ============================================================================
-- Migration: Improve PayOS matching with numeric order codes
-- ============================================================================

begin;

-- 1. Add numeric_order_code to orders for reliable PayOS matching
alter table public.orders 
  add column if not exists numeric_order_code bigint;

create index if not exists orders_numeric_code_idx on public.orders(numeric_order_code);

-- 2. Update the matching RPC to support numeric order codes
-- This makes PayOS matching 100% reliable even if transfer content is truncated.
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
  v_numeric_code    bigint;
  v_order           public.orders%rowtype;
  v_tx_id           uuid;
  v_paid_at         timestamptz := coalesce(p_paid_at, now());
begin
  if v_txn_ref is null then
    raise exception 'MISSING_TRANSACTION_ID' using errcode = '22023';
  end if;

  -- 1. Record the transaction
  insert into public.payment_transactions (
    provider, provider_transaction_id, bank_id, account_number, account_name,
    amount, currency, transfer_content, raw_payload, paid_at
  ) values (
    v_provider, v_txn_ref, v_bank_id, v_account_number, v_account_name,
    p_amount, v_currency, v_content, coalesce(p_raw_payload, '{}'::jsonb), v_paid_at
  )
  on conflict (provider, provider_transaction_id) do nothing
  returning id into v_tx_id;

  if not found then
    -- Handle duplicate webhook
    select pt.id, pt.matched_order_id, pt.matched_order_code into v_tx_id, v_order.id, v_order.code
    from public.payment_transactions pt
    where provider = v_provider and provider_transaction_id = v_txn_ref;

    select payment_status, status into v_order.payment_status, v_order.status
    from public.orders where id = v_order.id;

    return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, v_order.id is not null, true, 'DUPLICATE_WEBHOOK';
    return;
  end if;

  -- 2. Identify the order
  -- Strategy A: Numeric order code (for PayOS)
  if v_provider = 'payos' then
    v_numeric_code := (p_raw_payload->'data'->>'orderCode')::bigint;
  end if;

  -- Strategy B: Regex from transfer content
  v_order_code := (regexp_match(upper(v_content), '(VG-[A-F0-9]+-[A-F0-9]+)'))[1];

  select * into v_order
  from public.orders
  where (v_numeric_code is not null and numeric_order_code = v_numeric_code)
     or (v_order_code is not null and code = v_order_code)
  for update;

  if not found then
    update public.payment_transactions set status = 'manual_review', processed_at = now() where id = v_tx_id;
    return query select null::uuid, v_order_code, v_tx_id, null::text, null::text, false, false, 'ORDER_NOT_FOUND';
    return;
  end if;

  -- 3. Validate and Update
  update public.payment_transactions 
  set matched_order_id = v_order.id, matched_order_code = v_order.code 
  where id = v_tx_id;

  if v_order.status = 'cancelled' then
    update public.payment_transactions set status = 'manual_review', processed_at = now() where id = v_tx_id;
    return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'ORDER_CANCELLED';
    return;
  end if;

  if p_amount < v_order.total_amount then
    update public.payment_transactions set status = 'manual_review', processed_at = now() where id = v_tx_id;
    return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'AMOUNT_MISMATCH';
    return;
  end if;

  if v_order.payment_status = 'paid' then
    update public.payment_transactions set status = 'matched', processed_at = now() where id = v_tx_id;
    return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'ORDER_ALREADY_PAID';
    return;
  end if;

  -- Final update
  perform set_config('veganglow.payment_confirm_context', 'bank_webhook', true);
  update public.orders
     set payment_status = 'paid',
         payment_reference = v_txn_ref,
         paid_at = v_paid_at,
         status = case when status = 'pending' then 'confirmed' else status end
   where id = v_order.id
   returning * into v_order;

  update public.payment_transactions set status = 'matched', processed_at = now() where id = v_tx_id;

  return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'PAYMENT_CONFIRMED';
end $$;

commit;
