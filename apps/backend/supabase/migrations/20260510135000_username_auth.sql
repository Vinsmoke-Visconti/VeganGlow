-- Migration: Username-based registration support
-- RPC to resolve username -> email for login

begin;

-- RPC: Get email from username
-- Used by the login flow when a user enters their username instead of email.
-- Looks up the username in profiles, then returns the email from auth.users.
create or replace function public.get_email_from_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
begin
  if p_username is null or trim(p_username) = '' then
    return null;
  end if;

  -- Find user by username (case-insensitive)
  select id into v_user_id
  from public.profiles
  where lower(username) = lower(trim(p_username))
  limit 1;

  if v_user_id is null then
    return null;
  end if;

  -- Get email from auth.users
  select email into v_email
  from auth.users
  where id = v_user_id;

  return v_email;
end $$;

-- Allow anon and authenticated to call this (needed at login time before auth)
grant execute on function public.get_email_from_username(text) to anon, authenticated, service_role;

commit;
