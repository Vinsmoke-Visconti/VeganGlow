import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: './apps/web/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
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

  v_is_whitelist := lower(v_auth_email) IN (
    'phucoccho0147@gmail.com',
    'terrybin0147@gmail.com',
    'pascallaem@gmail.com',
    'quocvietcndc@gmail.com',
    'terrybin123@gmail.com',
    'quynhtram5358@gmail.com',
    'terrybin50@gmail.com',
    'binmin81@gmail.com'
  );

  IF v_is_whitelist THEN
    SELECT id INTO v_role_id FROM public.roles WHERE name = 'super_admin' LIMIT 1;

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

    UPDATE auth.users
    SET raw_app_metadata = coalesce(raw_app_metadata, '{}'::jsonb) || 
      jsonb_build_object('is_staff', true, 'role', 'super_admin')
    WHERE id = new.id;

    UPDATE public.staff_invitations
    SET status = 'accepted'
    WHERE email = v_auth_email AND status = 'pending';
  END IF;

  RETURN new;
END;
$$;
`;

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { query: sql });
  if (error) {
     const { data: d2, error: e2 } = await supabase.rpc('exec_sql', { query: sql });
     if (e2) {
       console.log("Error executing SQL directly. Please copy this SQL and run it in the Supabase SQL Editor:", sql);
     } else {
       console.log("Success with exec_sql");
     }
  } else {
    console.log("Success with execute_sql");
  }
}

run();
