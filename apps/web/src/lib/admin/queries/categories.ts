import { createClient } from '@/lib/supabase/server';

export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  product_count: number;
};

type RawCategory = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  products: { count: number }[] | null;
};

export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, created_at, products(count)')
    .order('name');
  return ((data ?? []) as unknown as RawCategory[]).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    created_at: c.created_at,
    product_count: c.products?.[0]?.count ?? 0,
  }));
}

export async function getCategory(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('categories').select('id, name, slug').eq('id', id).maybeSingle();
  return data;
}
