-- Migration: Expand profiles table for detailed staff/user info
-- Adding columns to match the Profile UI and support Google-based username prefilling.

do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='username') then
    alter table public.profiles add column username text unique;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='first_name') then
    alter table public.profiles add column first_name text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='last_name') then
    alter table public.profiles add column last_name text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='department') then
    alter table public.profiles add column department text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='position') then
    alter table public.profiles add column position text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='bio') then
    alter table public.profiles add column bio text;
  end if;
end $$;

-- Update handle_new_user to prefill username from Google/Email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
  v_full_name text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_username := coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1));

  insert into public.profiles (
    id, 
    full_name, 
    username,
    avatar_url
  )
  values (
    new.id, 
    v_full_name, 
    v_username,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    username = coalesce(public.profiles.username, excluded.username),
    avatar_url = excluded.avatar_url;
    
  return new;
end $$;
