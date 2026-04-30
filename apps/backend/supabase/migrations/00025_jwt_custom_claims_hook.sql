-- 00025_jwt_custom_claims_hook.sql
-- Purpose: Inject staff_role + permissions + is_super_admin + role_weight into JWT
--          app_metadata so middleware can authorize without DB roundtrip.
--          Enable via supabase config.toml: [auth.hook.custom_access_token].
--          Effective permissions = role_permissions ∪ user_permissions(grant=true)
--                                 - user_permissions(grant=false)

begin;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (event->>'user_id')::uuid;
  v_role text;
  v_weight int;
  v_role_perms text[];
  v_grants text[];
  v_revokes text[];
  v_effective text[];
  v_claims jsonb;
begin
  -- 1. Get role + weight
  select r.name, r.weight into v_role, v_weight
  from public.staff_profiles sp
  join public.roles r on r.id = sp.role_id
  where sp.id = v_user_id;

  -- 2. Role-based permissions
  if v_role is not null then
    select coalesce(array_agg(p.module || ':' || p.action), '{}') into v_role_perms
    from public.role_permissions rp
    join public.permissions p on p.id = rp.permission_id
    join public.staff_profiles sp on sp.role_id = rp.role_id
    where sp.id = v_user_id;

    -- 3. User-specific overrides (if user_permissions table exists from 00021)
    begin
      select coalesce(array_agg(p.module || ':' || p.action), '{}') into v_grants
      from public.user_permissions up
      join public.permissions p on p.id = up.permission_id
      where up.user_id = v_user_id and up.is_granted = true;

      select coalesce(array_agg(p.module || ':' || p.action), '{}') into v_revokes
      from public.user_permissions up
      join public.permissions p on p.id = up.permission_id
      where up.user_id = v_user_id and up.is_granted = false;
    exception when undefined_table then
      v_grants := '{}';
      v_revokes := '{}';
    end;

    -- 4. Effective = (role_perms ∪ grants) - revokes
    select array_agg(distinct p) into v_effective
    from (
      select unnest(v_role_perms) as p
      union
      select unnest(v_grants)
    ) merged
    where p is not null and not (p = any(v_revokes));
  end if;

  v_claims := coalesce(event->'claims', '{}'::jsonb);

  if (v_claims->'app_metadata') is null then
    v_claims := jsonb_set(v_claims, '{app_metadata}', '{}'::jsonb);
  end if;

  v_claims := jsonb_set(v_claims, '{app_metadata,staff_role}',
                        to_jsonb(coalesce(v_role, 'customer')));
  v_claims := jsonb_set(v_claims, '{app_metadata,role_weight}',
                        to_jsonb(coalesce(v_weight, 999)));
  v_claims := jsonb_set(v_claims, '{app_metadata,permissions}',
                        to_jsonb(coalesce(v_effective, '{}'::text[])));
  v_claims := jsonb_set(v_claims, '{app_metadata,is_super_admin}',
                        to_jsonb(v_role = 'super_admin'));

  return jsonb_build_object('claims', v_claims);
end $$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

commit;
