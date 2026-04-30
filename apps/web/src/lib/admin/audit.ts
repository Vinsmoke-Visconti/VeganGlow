import { createClient } from '@/lib/supabase/server';

export type AuditLogInput = {
  resource_type: string;
  resource_id?: string | null;
  action: string;
  entity?: string | null;
  entity_id?: string | null;
  summary?: string | null;
};

export async function logAction(input: AuditLogInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  const { error } = await supabase.from('audit_logs').insert({
    actor_id: user.id,
    resource_type: input.resource_type,
    resource_id: input.resource_id ?? null,
    action: input.action,
    entity: input.entity ?? null,
    entity_id: input.entity_id ?? null,
    summary: input.summary ?? null,
    ip_address: '0.0.0.0' // IP detection is limited in server actions without headers
  });

  if (error) {
    console.error('Failed to log audit entry:', error);
  }
}
