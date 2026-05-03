-- Migration: Secure Staff Invitation Accept
-- Ensures that the user accepting the invitation must use the exact same email address 
-- that the invitation was sent to.

create or replace function public.accept_staff_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_invitation record;
  v_user_id uuid := auth.uid();
  v_user_email text := auth.jwt() ->> 'email';
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

  -- 2. Verify that the logged-in user's email matches the invitation email EXACTLY
  if lower(v_user_email) != lower(v_invitation.email) then
    return jsonb_build_object('success', false, 'error', 'Từ chối truy cập: Tài khoản Google đang đăng nhập không khớp với email được mời.');
  end if;

  -- 3. Update user role in public.profiles
  update public.profiles
  set role = 'admin',
      full_name = coalesce(public.profiles.full_name, v_invitation.full_name),
      username = coalesce(public.profiles.username, split_part(v_invitation.email, '@', 1))
  where id = v_user_id;

  -- 4. Sync to staff_profiles
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

  -- 5. Mark invitation as accepted
  update public.staff_invitations
  set status = 'accepted'
  where id = v_invitation.id;

  return jsonb_build_object('success', true, 'role', 'admin');
end $$;
