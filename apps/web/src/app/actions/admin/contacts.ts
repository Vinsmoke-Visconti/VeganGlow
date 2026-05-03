'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { audit } from '@/lib/security/auditLog';
import { headers } from 'next/headers';

export async function resolveContactAction(formData: FormData) {
  const id = formData.get('id') as string;
  const resolve = formData.get('resolve') === 'true';

  if (!id) return;

  const supabase = await createClient();
  const { error } = await (supabase.from('contact_messages') as any)
    .update({ resolved_at: resolve ? new Date().toISOString() : null })
    .eq('id', id);

  if (error) {
    return;
  }

  // Ghi log
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0] ?? null;
  const userAgent = h.get('user-agent');
  
  await audit(
    { 
      action: resolve ? 'support.message_resolved' : 'support.message_reopened', 
      severity: 'info', 
      entity: 'contact_message', 
      entity_id: id,
      summary: resolve ? `Đã giải quyết liên hệ ID: ${id}` : `Mở lại liên hệ ID: ${id}`
    },
    { ip, userAgent }
  );

  revalidatePath('/admin/contacts');
}
