import { createClient } from '@/lib/supabase/server';
import type { ProductTag } from '@/lib/types/tag';

export async function listAllTags(): Promise<ProductTag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, slug, color, text_color, icon, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductTag[];
}

export async function listProductTagIds(productId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_tags')
    .select('tag_id')
    .eq('product_id', productId);
  if (error) throw error;
  return ((data ?? []) as { tag_id: string }[]).map((row) => row.tag_id);
}
