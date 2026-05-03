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
  let q = (supabase
    .from('audit_logs') as any)
    .select('id, actor_id, resource_type, resource_id, action, entity, entity_id, summary, ip_address, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (filters.module) q = q.eq('resource_type', filters.module);
  if (filters.actor_id) q = q.eq('actor_id', filters.actor_id);
  if (filters.from) q = q.gte('created_at', filters.from);
  if (filters.to) q = q.lte('created_at', filters.to);
  const { data } = await q;
  return (data ?? []) as AuditEntry[];
}

export async function listMyAuditEntries(limit = 50): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await (supabase
    .from('audit_logs') as any)
    .select('id, actor_id, resource_type, resource_id, action, entity, entity_id, summary, ip_address, created_at')
    .eq('actor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AuditEntry[];
}
