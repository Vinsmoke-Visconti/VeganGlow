'use server';

import { createClient } from '@/lib/supabase/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewsletterResult =
  | { success: true; mode: 'authenticated' | 'guest' }
  | { success: false; error: string };

export async function subscribeNewsletter(email: string): Promise<NewsletterResult> {
  const trimmed = email?.trim() ?? '';
  if (!EMAIL_REGEX.test(trimmed) || trimmed.length > 200) {
    return { success: false, error: 'Email không hợp lệ.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await (
      supabase.from('user_settings') as unknown as {
        upsert: (
          row: Record<string, string | boolean>,
          opts: { onConflict: string }
        ) => Promise<{ error: { message: string } | null }>;
      }
    ).upsert({ user_id: user.id, newsletters: true }, { onConflict: 'user_id' });

    if (error) return { success: false, error: 'Không cập nhật được tuỳ chọn.' };
    return { success: true, mode: 'authenticated' };
  }

  // Guest signup: parked into contact_messages until a dedicated table is added.
  const { error } = await (
    supabase.from('contact_messages') as unknown as {
      insert: (row: Record<string, string>) => Promise<{ error: { message: string } | null }>;
    }
  ).insert({
    name: 'Newsletter Subscriber',
    email: trimmed,
    subject: 'newsletter_subscribe',
    message: trimmed,
  });

  if (error) return { success: false, error: 'Không đăng ký được. Vui lòng thử lại.' };
  return { success: true, mode: 'guest' };
}
