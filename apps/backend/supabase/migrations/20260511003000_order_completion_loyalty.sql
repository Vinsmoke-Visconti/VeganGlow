-- 20260511003000_order_completion_loyalty.sql
-- Automatically updates profile's lifetime_spend, recalculates tier, 
-- and awards loyalty points when an order is marked as 'completed'.

begin;

create or replace function public.handle_order_completion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_points int;
begin
  -- Only trigger when status changes to 'completed'
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.user_id is not null then
      -- 1. Update lifetime_spend
      update public.profiles
      set lifetime_spend = lifetime_spend + new.total_amount
      where id = new.user_id;

      -- 2. Award loyalty points (e.g., 1 point per 1,000 VND spent)
      v_points := floor(new.total_amount / 1000);
      
      if v_points > 0 then
        insert into public.loyalty_points_ledger (user_id, delta, reason, reference_type, reference_id)
        values (new.user_id, v_points, 'order_purchase', 'order', new.id::text);

        update public.profiles
        set loyalty_points = loyalty_points + v_points
        where id = new.user_id;
      end if;

      -- 3. Recompute tier
      perform public.recompute_loyalty_tier(new.user_id);
    end if;
  end if;

  -- Handle order cancellation (refund points/spend if it was previously completed)
  -- This is optional but good for consistency
  if new.status = 'cancelled' and old.status = 'completed' then
    if new.user_id is not null then
      update public.profiles
      set lifetime_spend = greatest(0, lifetime_spend - new.total_amount)
      where id = new.user_id;

      v_points := floor(new.total_amount / 1000);
      if v_points > 0 then
        insert into public.loyalty_points_ledger (user_id, delta, reason, reference_type, reference_id)
        values (new.user_id, -v_points, 'order_refund', 'order', new.id::text);

        update public.profiles
        set loyalty_points = greatest(0, loyalty_points - v_points)
        where id = new.user_id;
      end if;

      perform public.recompute_loyalty_tier(new.user_id);
    end if;
  end if;

  return new;
end $$;

drop trigger if exists on_order_status_change on public.orders;
create trigger on_order_status_change
after update of status on public.orders
for each row
execute function public.handle_order_completion();

commit;
