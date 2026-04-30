'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true } | { ok: false; error: string };

export type CustomerEditInput = {
  id: string;
  full_name: string;
  username: string;
};

export async function updateCustomerProfile(input: CustomerEditInput): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ 
      full_name: input.full_name || null,
      username: input.username || null,
    } as never)
    .eq('id', input.id);
  
  if (error) return { ok: false, error: error.message };
  
  revalidatePath(`/admin/customers/${input.id}`);
  revalidatePath('/admin/customers');
  return { ok: true };
}
