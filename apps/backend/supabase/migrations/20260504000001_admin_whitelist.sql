-- Migration: Admin Whitelist for Demo
-- Automatically promotes specific emails to Super Admin on first login or if they exist.

CREATE OR REPLACE FUNCTION public.handle_admin_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_whitelist boolean;
  v_role_id uuid;
  v_auth_email text;
  v_auth_meta jsonb;
BEGIN
  -- Fetch email from auth.users since public.profiles doesn't have it
  SELECT email, raw_user_meta_data INTO v_auth_email, v_auth_meta FROM auth.users WHERE id = new.id;

  -- List of whitelisted admin emails
  v_is_whitelist := lower(v_auth_email) IN (
    'phucoccho0147@gmail.com',
    'terrybin0147@gmail.com',
    'pascallaem@gmail.com',
    'quocvietcndc@gmail.com',
    'terrybin123@gmail.com',
    'quynhtram5358@gmail.com',
    'binmin81@gmail.com'
  );

  IF v_is_whitelist THEN
    -- Get the Super Admin role ID
    SELECT id INTO v_role_id FROM public.roles WHERE name = 'super_admin' LIMIT 1;

    -- 1. Ensure they are in staff_profiles
    INSERT INTO public.staff_profiles (id, email, full_name, role_id, is_active)
    VALUES (
      new.id,
      v_auth_email,
      coalesce(v_auth_meta->>'full_name', split_part(v_auth_email, '@', 1)),
      v_role_id,
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      role_id = v_role_id,
      is_active = true;

    -- 2. Update Auth Metadata for JWT Claims (Supabase Auth)
    -- This ensures is_staff: true and role: super_admin are in the JWT immediately
    UPDATE auth.users
    SET raw_app_metadata = coalesce(raw_app_metadata, '{}'::jsonb) || 
      jsonb_build_object('is_staff', true, 'role', 'super_admin')
    WHERE id = new.id;

    -- 3. Mark any pending invitations as accepted
    UPDATE public.staff_invitations
    SET status = 'accepted'
    WHERE email = v_auth_email AND status = 'pending';
  END IF;

  RETURN new;
END;
$$;

-- Apply this logic after the profile is created
DROP TRIGGER IF EXISTS tr_admin_whitelist ON public.profiles;
CREATE TRIGGER tr_admin_whitelist
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_whitelist();

-- Also pre-provision invitations for these emails just in case, so they show up in the UI
DO $$
DECLARE
  r record;
  v_role_id uuid;
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'super_admin' LIMIT 1;
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' OR role = 'super_admin' LIMIT 1;

  FOR r IN 
    SELECT unnest(ARRAY[
      'phucoccho0147@gmail.com',
      'terrybin0147@gmail.com',
      'pascallaem@gmail.com',
      'quocvietcndc@gmail.com',
      'terrybin123@gmail.com',
      'quynhtram5358@gmail.com',
      'terrybin50@gmail.com'
    ]) as email
  LOOP
    INSERT INTO public.staff_invitations (email, full_name, role_id, invited_by, status)
    VALUES (r.email, split_part(r.email, '@', 1), v_role_id, v_admin_id, 'pending')
    ON CONFLICT (email) WHERE status = 'pending' DO NOTHING;
  END LOOP;
END $$;
