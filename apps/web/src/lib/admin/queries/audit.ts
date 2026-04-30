import { createClient } from '@/lib/supabase/server';

export type AuditEntry = {
  id: string;
  actor_id: string | null;
  resource_type: string;
  resource_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  summary: string | null;
  ip_address: string | null;
  created_at: string;
  actor?: {
    full_name: string;
    role: { display_name: string; weight: number };
  } | null;
};

export type AuditFilters = {
  module?: string;
  actor_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export async function listAuditEntries(filters: AuditFilters = {}): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;

  // 1. Get current user's weight
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: myProfile } = (await supabase
    .from('staff_profiles')
    .select('role:roles(weight)')
    .eq('id', user.id)
    .maybeSingle()) as any;
  
  const myWeight = myProfile?.role?.weight ?? 0;

  // 2. Query audit logs with actor info
  // We filter by weight in JS or via a subquery if possible, 
  // but for simplicity and reliability in Supabase, we'll fetch and filter or use a join.
  let q = supabase
    .from('audit_logs')
    .select(`
      id, actor_id, resource_type, resource_id, action, entity, entity_id, summary, ip_address, created_at,
      actor:staff_profiles(
        full_name,
        role:roles(display_name, weight)
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.module) q = q.eq('resource_type', filters.module);
  if (filters.actor_id) q = q.eq('actor_id', filters.actor_id);
  if (filters.from) q = q.gte('created_at', filters.from);
  if (filters.to) q = q.lte('created_at', filters.to);

  const { data } = await q;
  const results = (data ?? []) as any[];

  // 3. Filter by weight: Role X sees Role Y only if weight X >= weight Y
  // Actually, user said "superadmin > role thấp hơn", "role nhỏ không thấy log role cao".
  // This implies: current_weight >= actor_weight.
  return results.filter(entry => {
    const actorWeight = entry.actor?.role?.weight ?? 0;
    return myWeight >= actorWeight;
  }) as AuditEntry[];
}

export async function listMyAuditEntries(limit = 50): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('audit_logs')
    .select('id, actor_id, resource_type, resource_id, action, entity, entity_id, summary, ip_address, created_at')
    .eq('actor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AuditEntry[];
}
