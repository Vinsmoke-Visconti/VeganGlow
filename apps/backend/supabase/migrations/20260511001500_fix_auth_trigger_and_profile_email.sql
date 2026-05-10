-- ============================================================================
-- Migration: Fix profiles schema and handle_new_user trigger
-- ============================================================================

begin;

-- 1. Remove broken legacy triggers and functions
drop function if exists public.prevent_role_change() cascade;
drop function if exists public.handle_admin_whitelist() cascade;

-- 2. Ensure public.profiles has the email column
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='email') then
    alter table public.profiles add column email text;
  end if;
end $$;

-- 3. Repair handle_new_user trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role_id uuid;
  v_full_name text;
  v_username text;
begin
  -- Get the default 'customer' role ID
  select id into v_role_id from public.roles where name = 'customer' limit 1;

  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  
  -- Generate username if not present
  v_username := coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1));
  v_username := lower(regexp_replace(v_username, '[^a-zA-Z0-9._-]', '', 'g'));

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

-- 4. Re-ensure the auth trigger is correctly wired
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Backfill any missing emails in profiles
-- (Triggers on profiles are already dropped/cascaded above)
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

commit;
