-- Migration: Deprecate profiles.role column in favor of roles/staff_profiles

-- 1. Drop the index relying on profiles.role
DROP INDEX IF EXISTS public.profiles_role_created_idx;

-- 2. Update private.is_admin to not use profiles.role
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only rely on the new staff_profiles hierarchy
  SELECT private.is_staff();
$$;

-- 3. Update public.accept_staff_invitation to not update profiles.role
CREATE OR REPLACE FUNCTION public.accept_staff_invitation(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invitation record;
  v_user_id uuid := auth.uid();
  v_user_email text := auth.jwt() ->> 'email';
BEGIN
  -- 1. Find valid invitation
  SELECT * INTO v_invitation
  FROM public.staff_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mã mời không hợp lệ hoặc đã hết hạn');
  END IF;

  -- 2. Verify that the logged-in user's email matches the invitation email EXACTLY
  IF lower(v_user_email) != lower(v_invitation.email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Từ chối truy cập: Tài khoản Google đang đăng nhập không khớp với email được mời.');
  END IF;

  -- 3. Update profile names
  UPDATE public.profiles
  SET full_name = coalesce(public.profiles.full_name, v_invitation.full_name),
      username = coalesce(public.profiles.username, split_part(v_invitation.email, '@', 1))
  WHERE id = v_user_id;

  -- 4. Sync to staff_profiles
  INSERT INTO public.staff_profiles (id, role_id, full_name, email, is_active)
  VALUES (
    v_user_id, 
    v_invitation.role_id, 
    v_invitation.full_name, 
    v_invitation.email,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    role_id = v_invitation.role_id,
    full_name = coalesce(excluded.full_name, public.staff_profiles.full_name),
    is_active = true;

  -- 5. Mark invitation as accepted
  UPDATE public.staff_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'role', 'admin');
END $$;

-- 4. Update admin_dashboard_kpis to count customers accurately without profiles.role
CREATE OR REPLACE FUNCTION public.admin_dashboard_kpis(
  p_since timestamptz,
  p_until timestamptz default now()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_len interval;
  v_prev_since timestamptz;
  v_prev_until timestamptz;
  v_revenue numeric;
  v_orders bigint;
  v_customers bigint;
  v_low_stock bigint;
  v_prev_revenue numeric;
  v_prev_orders bigint;
  v_prev_customers bigint;
BEGIN
  IF NOT (public.is_staff() OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'admin_dashboard_kpis: access denied';
  END IF;

  v_period_len := p_until - p_since;
  v_prev_since := p_since - v_period_len;
  v_prev_until := p_since;

  -- Current period
  SELECT coalesce(sum(case when status <> 'cancelled' then total_amount else 0 end), 0), count(*)
  INTO v_revenue, v_orders
  FROM public.orders
  WHERE created_at >= p_since AND created_at < p_until;

  SELECT count(*) INTO v_customers
  FROM public.profiles p
  LEFT JOIN public.staff_profiles sp ON sp.id = p.id
  WHERE sp.id IS NULL AND p.created_at >= p_since AND p.created_at < p_until;

  SELECT count(*) INTO v_low_stock
  FROM public.products
  WHERE is_active = true AND stock < 5;

  -- Previous period (for delta %)
  SELECT coalesce(sum(case when status <> 'cancelled' then total_amount else 0 end), 0), count(*)
  INTO v_prev_revenue, v_prev_orders
  FROM public.orders
  WHERE created_at >= v_prev_since AND created_at < v_prev_until;

  SELECT count(*) INTO v_prev_customers
  FROM public.profiles p
  LEFT JOIN public.staff_profiles sp ON sp.id = p.id
  WHERE sp.id IS NULL AND p.created_at >= v_prev_since AND p.created_at < v_prev_until;

  RETURN jsonb_build_object(
    'revenue', v_revenue,
    'orders', v_orders,
    'customers', v_customers,
    'low_stock', v_low_stock,
    'prev_revenue', v_prev_revenue,
    'prev_orders', v_prev_orders,
    'prev_customers', v_prev_customers
  );
END $$;

-- 5. Actually drop the column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- 6. Add a new index that helps identifying customers for performance
CREATE INDEX IF NOT EXISTS profiles_created_idx
  ON public.profiles (created_at DESC);
