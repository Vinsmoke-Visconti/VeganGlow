-- VeganGlow checkout helpers — atomic stock decrement & order creation

-- Atomic decrement: returns FALSE if insufficient stock (no row updated)
create or replace function public.decrement_stock(p_product_id uuid, p_quantity integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  affected integer;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  update public.products
     set stock = stock - p_quantity
   where id = p_product_id
     and is_active = true
     and stock >= p_quantity;

  get diagnostics affected = row_count;
  return affected > 0;
end $$;

revoke all on function public.decrement_stock(uuid, integer) from public;
grant execute on function public.decrement_stock(uuid, integer) to authenticated, service_role;

-- Helper: count of orders by user (for CRM customer LTV)
create or replace function public.user_order_stats(p_user_id uuid)
returns table(order_count bigint, total_spent numeric, last_order_at timestamptz)
language sql stable as $$
  select
    count(*)::bigint as order_count,
    coalesce(sum(total_amount), 0)::numeric as total_spent,
    max(created_at) as last_order_at
  from public.orders
  where user_id = p_user_id
    and status != 'cancelled';
$$;
