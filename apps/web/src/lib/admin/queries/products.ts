import { createClient } from '@/lib/supabase/server';

export type ProductStockFilter = 'in' | 'low' | 'out';
export type ProductListFilters = { q?: string; category?: string; stock?: ProductStockFilter };

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  image: string;
  is_active: boolean;
  rating: number;
  reviews_count: number;
  category: { id: string; name: string; slug: string } | null;
};

export type ProductDetail = {
  id: string;
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

export async function listProducts(filters: ProductListFilters = {}): Promise<ProductRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('products')
    .select('id, name, slug, price, stock, image, is_active, rating, reviews_count, category:categories(id, name, slug)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filters.q) query = query.ilike('name', `%${filters.q}%`);
  if (filters.category) query = query.eq('category_id', filters.category);
  if (filters.stock === 'out') query = query.eq('stock', 0);
  if (filters.stock === 'low') query = query.gt('stock', 0).lt('stock', 5);
  if (filters.stock === 'in') query = query.gte('stock', 5);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ProductRow[];
}

export async function getProduct(id: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, category_id, image, description, ingredients, stock, is_active')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as ProductDetail | null) ?? null;
}

export async function listAllCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from('categories').select('id, name, slug').order('name');
  return data ?? [];
}
