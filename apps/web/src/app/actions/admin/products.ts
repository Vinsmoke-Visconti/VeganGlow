'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true; id?: string } | { ok: false; error: string };

export type ProductInput = {
  id?: string;
  name: string;
  slug: string;
  price: number;
  category_id: string | null;
  image: string;
  description: string;
  ingredients: string;
  stock: number;
  is_active: boolean;
};

export async function upsertProduct(input: ProductInput): Promise<Result> {
  const supabase = await createClient();
  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase.from('products').update(rest as never).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${id}`);
    return { ok: true, id };
  } else {
    const { id: _ignored, ...rest } = input;
    void _ignored;
    const { data, error } = await supabase
      .from('products')
      .insert(rest as never)
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/products');
    return { ok: true, id: (data as { id: string }).id };
  }
}

export async function deleteProduct(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/products');
  return { ok: true };
}

export async function toggleProductActive(id: string, isActive: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive } as never)
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/products');
  return { ok: true };
}
