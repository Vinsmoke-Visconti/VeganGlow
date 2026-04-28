'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true } | { ok: false; error: string };

export async function setSystemSetting(key: string, value: unknown): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Chưa đăng nhập' };
  const { error } = await supabase
    .from('system_settings')
    .upsert(
      {
        key,
        value: value as Record<string, unknown>,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'key' },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/settings');
  return { ok: true };
}
