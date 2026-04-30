'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type ContactResult =
  | { success: true }
  | { success: false; error: string };

export async function submitContactMessage(input: ContactInput): Promise<ContactResult> {
  const name = input.name?.trim() ?? '';
  const email = input.email?.trim() ?? '';
  const subject = input.subject?.trim() ?? '';
  const message = input.message?.trim() ?? '';

  if (name.length < 2 || name.length > 120) {
    return { success: false, error: 'Họ tên không hợp lệ.' };
  }
  if (!EMAIL_REGEX.test(email) || email.length > 200) {
    return { success: false, error: 'Email không hợp lệ.' };
  }
  if (subject.length > 200) {
    return { success: false, error: 'Tiêu đề quá dài.' };
  }
  if (message.length < 5 || message.length > 4000) {
    return { success: false, error: 'Nội dung phải từ 5 đến 4000 ký tự.' };
  }

  const supabase = await createClient();

  // user_id auto-fills via trg_contact_messages_user when authenticated.
  const { error } = await (
    supabase.from('contact_messages') as unknown as {
      insert: (row: Record<string, string>) => Promise<{ error: { message: string } | null }>;
    }
  ).insert({ name, email, subject, message });

  if (error) {
    return { success: false, error: 'Không gửi được tin nhắn. Vui lòng thử lại.' };
  }

  revalidatePath('/contact');
  return { success: true };
}
