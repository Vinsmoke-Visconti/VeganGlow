-- VeganGlow payment system fixes (post-review).
-- 1. Stock leak: cancel_expired_bank_transfer_orders now restocks order_items
--    when an unpaid VietQR order is auto-cancelled.
-- 2. Admin escape hatch: super_admin can manually mark a bank_transfer order
--    as paid (e.g., when the bank webhook is unavailable).
-- 3. Tighten beneficiary-name check: empty/missing name no longer satisfies
--    the strict-match guard.
-- 4. Performance: partial index on (payment_due_at) where payment_status =
--    'pending' for the cron sweep.

begin;

-- ---------- 1) Restock on expiry ----------
create or replace function private.cancel_expired_bank_transfer_orders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  -- Lock candidate orders first; SKIP LOCKED so concurrent cron workers
  -- don't process the same row twice.
  create temp table _expiring_orders on commit drop as
  select id
    from public.orders
   where payment_method in ('bank_transfer', 'card')
     and payment_status = 'pending'
     and status = 'pending'
     and payment_due_at is not null
     and payment_due_at < now()
   order by payment_due_at
   limit 200
   for update skip locked;

  -- Restock first (before status flips to cancelled), so the rule
  -- "stock returns when order is cancelled-while-unpaid" is satisfied
  -- atomically inside this transaction.
  update public.products p
     set stock = p.stock + oi.quantity
    from public.order_items oi
    join _expiring_orders eo on eo.id = oi.order_id
   where p.id = oi.product_id;

  -- Now flip status. The trigger enforce_order_status_transition allows
  -- pending -> cancelled regardless of payment_status, so this is safe.
  update public.orders o
     set status = 'cancelled',
         payment_status = 'failed'
    from _expiring_orders eo
   where o.id = eo.id;

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

-- ---------- 2) Admin manual confirm ----------
-- super_admin can manually confirm a bank_transfer payment (when webhook is
-- unavailable, or for offline reconciliation). Records a synthetic
-- payment_transaction so audit trail is preserved, and uses the same
-- veganglow.payment_confirm_context guard as the webhook path.

create or replace function private.admin_confirm_bank_transfer_payment(
  p_order_id uuid,
  p_note     text default null
) returns table(
  order_id uuid,
  order_code text,
  transaction_id uuid,
  payment_status text,
  order_status text,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor      uuid := auth.uid();
  v_order      public.orders%rowtype;
  v_tx_id      uuid;
  v_synth_ref  text;
begin
  if v_actor is null or not public.is_super_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_order.payment_method not in ('bank_transfer', 'card') then
    raise exception 'NOT_BANK_TRANSFER' using errcode = '22023';
  end if;

  if v_order.payment_status = 'paid' then
    return query
    select v_order.id, v_order.code, null::uuid, v_order.payment_status, v_order.status, 'ALREADY_PAID';
    return;
  end if;

  v_synth_ref := 'manual:' || v_actor::text || ':' || v_order.id::text || ':' ||
                 to_char(extract(epoch from clock_timestamp())::bigint, 'FM9999999999');

  insert into public.payment_transactions (
    provider, provider_transaction_id, bank_id, account_number, account_name,
    amount, currency, transfer_content, raw_payload, paid_at,
    matched_order_id, matched_order_code, status, processed_at
  ) values (
    'manual', v_synth_ref, 'MANUAL', 'MANUAL', 'MANUAL_ADMIN_OVERRIDE',
    v_order.total_amount, 'VND',
    coalesce(p_note, 'Admin manual confirm for ' || v_order.code),
    jsonb_build_object('actor_id', v_actor, 'note', p_note, 'reason', 'admin_manual_confirm'),
    now(), v_order.id, v_order.code, 'matched', now()
  ) returning id into v_tx_id;

  -- Use the same context the webhook uses, so the trigger allows the flip.
  perform set_config('veganglow.payment_confirm_context', 'bank_webhook', true);

  update public.orders
     set payment_status = 'paid',
         payment_reference = v_synth_ref,
         paid_at = now(),
         status = case when status = 'pending' then 'confirmed' else status end
   where id = v_order.id
   returning * into v_order;

  return query
  select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, 'PAYMENT_CONFIRMED';
end $$;

revoke all on function private.admin_confirm_bank_transfer_payment(uuid, text) from public;
grant execute on function private.admin_confirm_bank_transfer_payment(uuid, text)
  to authenticated, service_role;

create or replace function public.admin_confirm_bank_transfer_payment(
  p_order_id uuid,
  p_note     text default null
) returns table(
  order_id uuid,
  order_code text,
  transaction_id uuid,
  payment_status text,
  order_status text,
  message text
)
language sql
set search_path = public
as $$
  select * from private.admin_confirm_bank_transfer_payment(p_order_id, p_note);
$$;

revoke all on function public.admin_confirm_bank_transfer_payment(uuid, text) from public, anon;
grant execute on function public.admin_confirm_bank_transfer_payment(uuid, text)
  to authenticated, service_role;

-- ---------- 3) Tighten beneficiary-name check ----------
-- Reject payments where account_name is empty/missing. Previously a missing
-- name silently passed the strict-match guard.

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

  -- Tightened: empty account_name is now rejected (was: silently allowed).
  if v_bank_id not in ('MB', 'MBBANK')
     or v_account_number <> '2111122227777'
     or v_account_name = ''
     or v_account_name <> 'PHAM HOAI THUONG' then
    update public.payment_transactions
       set status = 'rejected', processed_at = now()
     where id = v_tx_id;

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

  select * into v_order from public.orders where code = v_order_code for update;

  if not found then
    update public.payment_transactions
       set status = 'manual_review', matched_order_code = v_order_code, processed_at = now()
     where id = v_tx_id;
    return query select null::uuid, v_order_code, v_tx_id, null::text, null::text, false, false, 'ORDER_NOT_FOUND';
    return;
  end if;

  update public.payment_transactions
     set matched_order_id = v_order.id, matched_order_code = v_order.code
   where id = v_tx_id;

  if v_order.payment_method not in ('bank_transfer', 'card') then
    update public.payment_transactions set status = 'manual_review', processed_at = now() where id = v_tx_id;
    return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'ORDER_NOT_BANK_TRANSFER';
    return;
  end if;

  if v_order.status = 'cancelled' then
    update public.payment_transactions set status = 'manual_review', processed_at = now() where id = v_tx_id;
    return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'ORDER_CANCELLED';
    return;
  end if;

  if p_amount <> v_order.total_amount then
    update public.payment_transactions set status = 'manual_review', processed_at = now() where id = v_tx_id;
    return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'AMOUNT_MISMATCH';
    return;
  end if;

  if v_order.payment_status = 'paid' then
    update public.payment_transactions set status = 'manual_review', processed_at = now() where id = v_tx_id;
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

  update public.payment_transactions set status = 'matched', processed_at = now() where id = v_tx_id;

  return query select v_order.id, v_order.code, v_tx_id, v_order.payment_status, v_order.status, true, false, 'PAYMENT_CONFIRMED';
end $$;

-- ---------- 4) Performance index ----------
create index if not exists orders_pending_due_idx
  on public.orders(payment_due_at)
  where payment_status = 'pending' and payment_due_at is not null;

commit;
