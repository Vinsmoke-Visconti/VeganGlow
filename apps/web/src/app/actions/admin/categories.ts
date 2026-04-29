'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true; id?: string } | { ok: false; error: string };

export type CategoryInput = {
  id?: string;
  name: string;
  slug: string;
};

export async function upsertCategory(input: CategoryInput): Promise<Result> {
  const supabase = await createClient();
  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase.from('categories').update(rest as never).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/categories');
    return { ok: true, id };
  } else {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: input.name, slug: input.slug } as never)
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/categories');
    return { ok: true, id: (data as { id: string }).id };
  }
}

export async function deleteCategory(id: string): Promise<Result> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: `Còn ${count} sản phẩm thuộc danh mục này. Hãy chuyển danh mục cho sản phẩm trước.` };
  }
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/categories');
  return { ok: true };
}
