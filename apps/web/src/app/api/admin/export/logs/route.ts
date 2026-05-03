import { createClient } from '@/lib/supabase/server';
import { decodeAccessToken, isSuperAdmin, hasPermission } from '@/lib/security/jwtClaims';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const claims = decodeAccessToken(session?.access_token ?? null);
  const canSeeAll = isSuperAdmin(claims) || hasPermission(claims, 'audit:read');
  const role = claims?.app_metadata?.staff_role;
  
  if (!role || role === 'customer') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);

  let query = supabase
    .from('audit_logs')
    .select('id, created_at, actor_id, actor_name, action, entity, entity_id, summary, ip_address, user_agent, severity')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (!canSeeAll) {
    query = query.eq('actor_id', session!.user.id);
  }

  const { data, error } = await query;

  if (error) {
    return new NextResponse('Failed to fetch logs', { status: 500 });
  }

  // Generate CSV
  const header = ['ID,Date,Actor,Action,Entity,EntityID,Summary,IP,Severity'];
  const rows = (data || []).map(row => {
    return [
      row.id,
      new Date(row.created_at).toISOString(),
      `"${row.actor_name || row.actor_id}"`,
      `"${row.action}"`,
      `"${row.entity || ''}"`,
      `"${row.entity_id || ''}"`,
      `"${(row.summary || '').replace(/"/g, '""')}"`,
      `"${row.ip_address || ''}"`,
      `"${row.severity || ''}"`
    ].join(',');
  });

  const csvContent = [...header, ...rows].join('\n');
  // Include BOM for Excel UTF-8 support
  const bom = '\uFEFF';

  return new NextResponse(bom + csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="veganglow-audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
