-- Staff Invitation System
create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role_id uuid not null references public.roles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- Create a partial unique index for pending invitations
create unique index if not exists idx_staff_invitations_email_pending 
on public.staff_invitations (email) 
where status = 'pending';

-- RLS for staff_invitations
alter table public.staff_invitations enable row level security;

drop policy if exists invitations_admin_all on public.staff_invitations;
create policy invitations_admin_all on public.staff_invitations 
for all using (public.is_admin()) with check (public.is_admin());

-- Function to handle invitation acceptance
create or replace function public.accept_staff_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_invitation record;
  v_user_id uuid := auth.uid();
begin
  -- 1. Find valid invitation
  select * into v_invitation
  from public.staff_invitations
  where token = p_token
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Mã mời không hợp lệ hoặc đã hết hạn');
  end if;

  -- 2. Update user role in public.profiles
  update public.profiles
  set role = 'admin',
      full_name = coalesce(public.profiles.full_name, v_invitation.full_name),
      username = coalesce(public.profiles.username, split_part(v_invitation.email, '@', 1))
  where id = v_user_id;

  -- 3. Sync to staff_profiles
  insert into public.staff_profiles (id, role_id, full_name, email, is_active)
  values (
    v_user_id, 
    v_invitation.role_id, 
    v_invitation.full_name, 
    v_invitation.email,
    true
  )
  on conflict (id) do update set
    role_id = v_invitation.role_id,
    full_name = coalesce(excluded.full_name, public.staff_profiles.full_name),
    is_active = true;

  -- 4. Mark invitation as accepted
  update public.staff_invitations
  set status = 'accepted'
  where id = v_invitation.id;

  return jsonb_build_object('success', true, 'role', v_invitation.role);
end $$;
