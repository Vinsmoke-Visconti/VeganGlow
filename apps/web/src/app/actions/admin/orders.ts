'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true } | { ok: false; error: string };

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('orders')
    .update({ status } as never)
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin');
  return { ok: true };
}
