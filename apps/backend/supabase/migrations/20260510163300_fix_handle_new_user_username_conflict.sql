-- Fix: Make handle_new_user resilient to username conflicts.
-- When a new user signs up via OAuth/Email, generate a unique username
-- by appending a random suffix if the base username already exists.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
  v_full_name text;
  v_base_username text;
  v_counter int := 0;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_base_username := coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1));
  
  -- Sanitize username: lowercase, remove special chars except . _ -
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
