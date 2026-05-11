-- 20260511005000_fix_auth_trigger_username_conflict_final.sql
-- Fixes the handle_new_user trigger to properly handle unique username conflicts
-- while still setting email and role properly.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role_id uuid;
  v_full_name text;
  v_base_username text;
  v_username text;
  v_counter int := 0;
begin
  -- Get the default 'customer' role ID
  select id into v_role_id from public.roles where name = 'customer' limit 1;

  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  
  -- Base username generation
  v_base_username := coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1));
  v_base_username := lower(regexp_replace(v_base_username, '[^a-zA-Z0-9._-]', '', 'g'));
  
  -- Ensure minimum length
  if length(v_base_username) < 3 then
    v_base_username := v_base_username || substr(md5(new.id::text), 1, 6);
  end if;
  
  -- Try to find a unique username
  v_username := v_base_username;
  while exists (select 1 from public.profiles where username = v_username and id != new.id) loop
    v_counter := v_counter + 1;
    v_username := v_base_username || v_counter::text;
    -- Safety valve to prevent infinite loop
    if v_counter > 100 then
      v_username := v_base_username || substr(md5(random()::text), 1, 6);
      exit;
    end if;
  end loop;

  -- Create the profile
  insert into public.profiles (id, email, full_name, username, role_id, created_at)
  values (
    new.id,
    new.email,
    v_full_name,
    v_username,
    v_role_id,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    username = coalesce(public.profiles.username, excluded.username);

  -- Perform staff promotion if this email was invited
  begin
    perform public.accept_staff_invitation_for(new.id);
  exception when others then
    raise warning 'Failed to accept staff invitation for user %: %', new.id, sqlerrm;
  end;

  return new;
end $$;

commit;
