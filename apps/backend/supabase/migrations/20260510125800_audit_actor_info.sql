-- Add actor_name and actor_role to audit_logs for richer log display
-- These are denormalized fields so logs remain readable even if the user is deleted

BEGIN;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS actor_role text;

-- Recreate the RPC to also accept and store actor_name and actor_role
CREATE OR REPLACE FUNCTION public.log_admin_action_v2(
  p_action text,
  p_severity text DEFAULT 'info',
  p_entity text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_summary text DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_ip_hash text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_actor_name text DEFAULT NULL,
  p_actor_role text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.audit_logs
    (actor_id, action, severity, entity, entity_id, summary, details,
     ip_hash, user_agent, request_id, resource_type, actor_name, actor_role)
  VALUES
    (auth.uid(), p_action, p_severity, p_entity, p_entity_id, p_summary, p_details,
     p_ip_hash, p_user_agent, p_request_id, coalesce(p_entity, 'unknown'), p_actor_name, p_actor_role)
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN others THEN
  RETURN NULL;
END $$;

-- Revoke and Grant (must match the new signature with 11 params)
REVOKE ALL ON FUNCTION public.log_admin_action_v2(text, text, text, text, text, jsonb, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_admin_action_v2(text, text, text, text, text, jsonb, text, text, text, text, text) TO authenticated, anon;

-- Backfill: try to populate actor_name from staff_profiles for existing rows
UPDATE public.audit_logs al
SET actor_name = sp.full_name
FROM public.staff_profiles sp
WHERE al.actor_id = sp.id AND al.actor_name IS NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
