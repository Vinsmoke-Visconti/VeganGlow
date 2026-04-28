-- VeganGlow Admin Provisioning
-- Implements the closed RBAC model:
--   1. Customers: auto-provisioned (already handled in 00001 via handle_new_user trigger).
--   2. Super Admin: seeded statically (template at the bottom of this file).
--   3. Staff (whitelist): super admin pre-authorizes by email; user logs in via
--      Google → trigger reads staff_invitations and promotes them to staff_profiles.
--   4. Developer/Collaborator: GitHub OAuth + repo collaborator check is enforced
--      in the app layer (auth callback) — DB just stores the resulting staff row.

-- ============== STAFF_INVITATIONS ==============
-- Whitelist managed by super_admin BEFORE the staff member ever signs in.
create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role_id uuid not null references public.roles(id),
  full_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists staff_invitations_status_idx
  on public.staff_invitations(status);

-- ============== AUTO-PROMOTE ON FIRST LOGIN ==============
-- Called from the auth.users insert trigger. If the user's email is a pending
-- invitation, promote them to staff_profiles with the invited role.
create or replace function public.accept_staff_invitation_for(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_inv   public.staff_invitations%rowtype;
  v_full_name text;
begin
  select email, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
    into v_email, v_full_name
  from auth.users
  where id = p_user_id;

  if v_email is null then
    return false;
  end if;

  select * into v_inv
  from public.staff_invitations
  where lower(email) = lower(v_email)
    and status = 'pending'
  limit 1;

  if not found then
    return false;
  end if;

  insert into public.staff_profiles (id, role_id, full_name, email, is_active, created_by)
  values (p_user_id, v_inv.role_id, coalesce(v_inv.full_name, v_full_name), v_email, true, v_inv.invited_by)
  on conflict (id) do update
    set role_id   = excluded.role_id,
        is_active = true;

  update public.staff_invitations
     set status      = 'accepted',
         accepted_at = now()
   where id = v_inv.id;

  return true;
end $$;

revoke all on function public.accept_staff_invitation_for(uuid) from public;
grant execute on function public.accept_staff_invitation_for(uuid) to authenticated, service_role;

-- Wire the auto-promote into the existing new-user trigger.
-- We extend handle_new_user so customers still get a profile row, AND if their
-- email matches a pending invitation, they're also added to staff_profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  perform public.accept_staff_invitation_for(new.id);
  return new;
end $$;

-- Trigger already exists from 00001; recreate to be idempotent.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Existing users that were already in auth.users when they got invited need a
-- manual sweep (they won't fire the trigger again). Super admin can call this:
create or replace function public.sweep_pending_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  if not public.is_super_admin() then
    raise exception 'Only super_admin can sweep invitations';
  end if;

  for r in
    select u.id
    from auth.users u
    join public.staff_invitations i on lower(i.email) = lower(u.email)
    where i.status = 'pending'
  loop
    if public.accept_staff_invitation_for(r.id) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end $$;

revoke all on function public.sweep_pending_invitations() from public;
grant execute on function public.sweep_pending_invitations() to authenticated;

-- ============== RLS ==============
alter table public.staff_invitations enable row level security;

drop policy if exists staff_invitations_read on public.staff_invitations;
create policy staff_invitations_read on public.staff_invitations
  for select using (public.is_super_admin());

drop policy if exists staff_invitations_write on public.staff_invitations;
create policy staff_invitations_write on public.staff_invitations
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ============== SUPER ADMIN SEED TEMPLATE ==============
-- This is the ONLY admin path that bypasses the whitelist. After running this
-- migration, do the following (one-time, in production-grade setups this would
-- be a separate operator-run script with secrets):
--
-- 1. Create the user in Supabase Auth (Dashboard > Authentication > Add user,
--    or sign up via Google OAuth) — note their email.
-- 2. Run this in SQL editor, replacing the email:
--
--   insert into public.staff_profiles (id, role_id, full_name, email, is_active)
--   values (
--     (select id from auth.users where email = 'YOUR_EMAIL@example.com'),
--     (select id from public.roles where name = 'super_admin'),
--     'Founder',
--     'YOUR_EMAIL@example.com',
--     true
--   )
--   on conflict (id) do update
--     set role_id   = (select id from public.roles where name = 'super_admin'),
--         is_active = true;
--
-- After that, all future staff are added through the invitation flow.
