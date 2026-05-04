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
BEGIN
  v_is_whitelist := lower(new.email) IN (
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
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
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
    WHERE email = new.email AND status = 'pending';
  END IF;

  RETURN new;
END;
$$;
`;

async function run() {
  // We can't use rpc('run_sql') because it might not exist.
  // I will use a direct insert to pg_query or maybe I will just tell the user.
  // Actually, Supabase JS client cannot execute raw SQL unless an RPC function is defined.
  // Does `execute_sql` exist?
  const { data, error } = await supabase.rpc('execute_sql', { query: sql });
  if (error) {
     const { data: d2, error: e2 } = await supabase.rpc('exec_sql', { query: sql });
     if (e2) {
       console.log("Could not execute raw SQL. Needs to be applied via psql or Supabase Dashboard.");
     } else {
       console.log("Success with exec_sql");
     }
  } else {
    console.log("Success with execute_sql");
  }
}

run();
