-- 00026_ensure_profile_on_signup.sql
-- Purpose: Trigger ensures every auth.users row has a corresponding profiles
--          row, so super_admin can checkout without FK errors. Backfill any
--          existing rows that are missing.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    now()
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: any auth.users without a profile (e.g., super_admin seeded earlier)
insert into public.profiles (id, email, full_name, created_at)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', ''), u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

commit;
