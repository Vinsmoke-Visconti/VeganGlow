-- 20260511006000_fix_customer_code_trigger.sql
-- Fixes the generate_customer_code trigger which relied on the deprecated 'role' column.

begin;

create or replace function public.generate_customer_code()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_customer_role_id uuid;
begin
  select id into v_customer_role_id from public.roles where name = 'customer' limit 1;
  
  if new.customer_code is null and new.role_id = v_customer_role_id then
    new.customer_code := 'VG-CUS-' || nextval('public.customer_code_seq');
  end if;
  
  return new;
end $$;

commit;
