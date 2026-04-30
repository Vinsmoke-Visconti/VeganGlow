import { createClient } from '@/lib/supabase/server';

export type ProductStockFilter = 'in' | 'low' | 'out';
export type ProductStatusFilter = 'active' | 'inactive';
export type ProductSortKey = 'name' | 'sku' | 'category' | 'price' | 'stock' | 'status' | 'created_at';
export type ProductSortDirection = 'asc' | 'desc';
export type ProductListFilters = {
  q?: string;
  category?: string;
  stock?: ProductStockFilter;
  status?: ProductStatusFilter;
  sort?: ProductSortKey;
  dir?: ProductSortDirection;
};

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
  created_at: string;
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
  const sort = normalizeSort(filters.sort);
  const ascending = filters.dir === 'asc';
  let query = supabase
    .from('products')
    .select('id, name, slug, price, stock, image, is_active, rating, reviews_count, created_at, category:categories(id, name, slug)');
  if (filters.q) query = query.ilike('name', `%${filters.q}%`);
  if (filters.category) query = query.eq('category_id', filters.category);
  if (filters.stock === 'out') query = query.eq('stock', 0);
  if (filters.stock === 'low') query = query.gt('stock', 0).lt('stock', 5);
  if (filters.stock === 'in') query = query.gte('stock', 5);
  if (filters.status === 'active') query = query.eq('is_active', true);
  if (filters.status === 'inactive') query = query.eq('is_active', false);

  if (sort === 'category') {
    query = query.order('created_at', { ascending: false }).limit(200);
  } else {
    query = query.order(productSortColumn(sort), { ascending }).order('created_at', { ascending: false }).limit(200);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as ProductRow[];
  if (sort !== 'category') return rows;

  return [...rows].sort((a, b) => {
    const left = a.category?.name ?? '';
    const right = b.category?.name ?? '';
    const result = left.localeCompare(right, 'vi');
    return ascending ? result : -result;
  });
}

function normalizeSort(sort: ProductListFilters['sort']): ProductSortKey {
  const valid: ProductSortKey[] = ['name', 'sku', 'category', 'price', 'stock', 'status', 'created_at'];
  return sort && valid.includes(sort) ? sort : 'created_at';
}

function productSortColumn(sort: Exclude<ProductSortKey, 'category'>): 'name' | 'id' | 'price' | 'stock' | 'is_active' | 'created_at' {
  if (sort === 'sku') return 'id';
  if (sort === 'status') return 'is_active';
  return sort;
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
