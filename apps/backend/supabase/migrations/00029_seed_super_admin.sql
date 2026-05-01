-- 00029_seed_super_admin.sql
-- Purpose: Ensure binmin81@gmail.com is provisioned as super_admin once they
--          sign up (or immediately if their auth.users row already exists).
--
-- Why: super_admin can access both storefront (purchase flow for end-to-end
--      testing) AND admin dashboard. Regular staff are blocked from
--      storefront purchase routes.
--
-- Idempotent: safe to re-run. If the user signs up later, the
--   sweep_pending_invitations() RPC (already in 00006) promotes them.

begin;

-- 1. Insert pending invitation (resolved when user signs up via trigger)
insert into public.staff_invitations (email, role_id, full_name, status, invited_by)
select 'binmin81@gmail.com',
       r.id,
       'Super Admin (binmin81)',
       'pending',
       null
from public.roles r
where r.name = 'super_admin'
on conflict (email) do update
  set role_id  = excluded.role_id,
      status   = 'pending',
      full_name = excluded.full_name;

-- 2. If user already exists in auth.users, promote them immediately
do $$
declare
  v_user_id uuid;
  v_role_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = 'binmin81@gmail.com';
  select id into v_role_id from public.roles where name = 'super_admin';

  if v_user_id is not null and v_role_id is not null then
    -- Ensure profiles row exists (00026 trigger handles future signups)
    insert into public.profiles (id, email, full_name, created_at)
    values (v_user_id, 'binmin81@gmail.com', 'Super Admin (binmin81)', now())
    on conflict (id) do nothing;

    -- Upsert staff_profiles with super_admin role
    insert into public.staff_profiles (id, full_name, role_id, is_active)
    values (v_user_id, 'Super Admin (binmin81)', v_role_id, true)
    on conflict (id) do update
      set role_id = excluded.role_id,
          is_active = true;

    -- Mark invitation accepted
    update public.staff_invitations
    set status = 'accepted'
    where lower(email) = 'binmin81@gmail.com';

    raise notice 'Promoted binmin81@gmail.com to super_admin (user_id=%)', v_user_id;
  else
    raise notice 'binmin81@gmail.com not yet in auth.users — will be promoted on first sign-in via sweep_pending_invitations';
  end if;
end $$;

commit;
