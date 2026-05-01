import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import Link from 'next/link';
import ProductCard, { type ProductCardProduct } from '@/components/products/ProductCard';
import { Search, X, Leaf, ShoppingBag } from 'lucide-react';
import SortSelect from '@/components/products/SortSelect';
import FilterDrawer from '@/components/products/FilterDrawer';
import { SORT_OPTIONS, PRICE_BRACKETS } from './constants';

type CategoryRow = { id: string; name: string; slug: string };
type CategoryWithCount = CategoryRow & { count: number };

type RawVariantSlim = {
  price: number | string;
  compare_at_price: number | string | null;
  position: number;
  is_active: boolean;
};

type RawProductRow = ProductCardProduct & {
  product_variants?: RawVariantSlim[] | null;
};

export const revalidate = 0;

type Params = { [key: string]: string | string[] | undefined };

function buildQueryString(params: Params, overrides: Params): string {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v.length > 0) merged[k] = v;
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === '' || v == null) {
      delete merged[k];
    } else if (typeof v === 'string') {
      merged[k] = v;
    }
  }
  const qs = new URLSearchParams(merged).toString();
  return qs ? `?${qs}` : '';
}

function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[%\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function parsePriceFilter(value: string | string[] | undefined): number {
  if (typeof value !== 'string' || value === '') return NaN;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return NaN;
  return Math.min(parsed, 100_000_000);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const query = typeof params.q === 'string' ? sanitizeSearchTerm(params.q) : '';
  const categorySlug = typeof params.category === 'string' ? params.category : '';
  const minPrice = parsePriceFilter(params.min);
  const maxPrice = parsePriceFilter(params.max);
  const sortValue = typeof params.sort === 'string' ? params.sort : 'newest';
  const sort = SORT_OPTIONS.find((s) => s.value === sortValue) || SORT_OPTIONS[0];

  const [categoriesRes, allActiveProductsRes] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    supabase.from('products').select('category_id').eq('is_active', true),
  ]);

  const rawCategories: CategoryRow[] = (categoriesRes.data as CategoryRow[] | null) ?? [];
  const activeProductRows: { category_id: string | null }[] =
    (allActiveProductsRes.data as { category_id: string | null }[] | null) ?? [];

  const categories: CategoryWithCount[] = rawCategories.map((cat) => ({
    ...cat,
    count: activeProductRows.filter((p) => p.category_id === cat.id).length,
  }));

  const totalCount = activeProductRows.length;
  const activeCategory = categories.find((c) => c.slug === categorySlug);

  let dbQuery = supabase
    .from('products')
    .select('*, categories!inner(name, slug), product_variants!left(price, compare_at_price, position, is_active)')
    .eq('is_active', true);

  if (query) dbQuery = dbQuery.ilike('name', `%${query}%`);
  if (categorySlug) dbQuery = dbQuery.eq('categories.slug', categorySlug);
  if (!isNaN(minPrice)) dbQuery = dbQuery.gte('price', minPrice);
  if (!isNaN(maxPrice)) dbQuery = dbQuery.lte('price', maxPrice);

  dbQuery = dbQuery.order(sort.column, { ascending: sort.ascending });

  const { data: products, error } = await dbQuery;
  if (error) console.error('Products query error:', error);

  const list: ProductCardProduct[] = ((products as RawProductRow[] | null) ?? []).map((p) => {
    const activeVariants = (p.product_variants ?? [])
      .filter((v) => v.is_active)
      .sort((a, b) => a.position - b.position);
    const def = activeVariants[0];
    const compare = def?.compare_at_price != null ? Number(def.compare_at_price) : null;
    return {
      ...p,
      default_compare_at_price: compare && compare > Number(p.price) ? compare : null,
    } as ProductCardProduct;
  });

  const activeFilterCount =
    (activeCategory ? 1 : 0) +
    (query ? 1 : 0) +
    (Number.isFinite(minPrice) || Number.isFinite(maxPrice) ? 1 : 0);

  const sidebar = (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Danh mục</span>
          {activeFilterCount > 0 && (
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"
            >
              <X size={12} /> Xóa lọc
            </Link>
          )}
        </div>
        <ul className="flex flex-col">
          <li>
            <Link
              href={`/products${buildQueryString(params, { category: '' })}`}
              className={`flex justify-between items-center py-2.5 border-b border-border-light text-sm transition ${
                !activeCategory ? 'text-text font-medium' : 'text-text-secondary hover:text-text'
              }`}
            >
              <span>Tất cả</span>
              <span className="text-xs text-text-muted">{totalCount}</span>
            </Link>
          </li>
          {categories.map((c) => {
            const isActive = activeCategory?.id === c.id;
            return (
              <li key={c.id}>
                <Link
                  href={`/products${buildQueryString(params, { category: c.slug })}`}
                  className={`flex justify-between items-center py-2.5 border-b border-border-light text-sm transition ${
                    isActive ? 'text-text font-medium' : 'text-text-secondary hover:text-text'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-text-muted">{c.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <span className="block text-[11px] uppercase tracking-[0.18em] text-text-muted mb-3">Khoảng giá</span>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRICE_BRACKETS.map((bracket, idx) => {
            const isActive =
              minPrice === bracket.min &&
              (maxPrice === bracket.max || (bracket.max === Infinity && !Number.isFinite(maxPrice)));
            return (
              <Link
                key={idx}
                href={`/products${buildQueryString(params, {
                  min: bracket.min.toString(),
                  max: bracket.max === Infinity ? '' : bracket.max.toString(),
                })}`}
                className={`inline-flex items-center px-3 h-9 rounded-full text-xs transition border ${
                  isActive
                    ? 'border-text bg-text text-white'
                    : 'border-border bg-white text-text-secondary hover:border-text hover:text-text'
                }`}
              >
                {bracket.label}
              </Link>
            );
          })}
        </div>

        <form action="/products" method="GET" className="flex flex-col gap-3">
          {Object.entries(params).map(([k, v]) =>
            typeof v === 'string' && k !== 'min' && k !== 'max' ? (
              <input key={k} type="hidden" name={k} value={v} />
            ) : null,
          )}
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="min"
              placeholder="Tối thiểu ₫"
              defaultValue={Number.isFinite(minPrice) ? minPrice : ''}
              className="flex-1 h-11 px-3 rounded-lg border border-border bg-white text-sm focus:border-text focus:outline-none"
              min="0"
            />
            <span className="text-text-muted">—</span>
            <input
              type="number"
              name="max"
              placeholder="Tối đa ₫"
              defaultValue={Number.isFinite(maxPrice) ? maxPrice : ''}
              className="flex-1 h-11 px-3 rounded-lg border border-border bg-white text-sm focus:border-text focus:outline-none"
              min="0"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition"
          >
            Áp dụng
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="text-center max-w-2xl mx-auto px-4 pt-12 pb-10 lg:pt-20 lg:pb-16">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-primary mb-4">
          <Leaf size={14} /> Bộ sưu tập VeganGlow
        </span>
        <h1 className="font-serif text-4xl lg:text-6xl font-medium tracking-tight text-text">
          Tất cả sản phẩm
        </h1>
        <p className="mt-4 text-text-secondary leading-relaxed">
          Khám phá bộ sưu tập mỹ phẩm thuần chay tinh khiết từ thảo dược Việt Nam.
        </p>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 lg:gap-12 pb-24">
        <aside className="hidden lg:block sticky top-24 self-start">{sidebar}</aside>

        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <form action="/products" method="GET" className="relative flex-1">
              {Object.entries(params).map(([k, v]) =>
                typeof v === 'string' && k !== 'q' ? (
                  <input key={k} type="hidden" name={k} value={v} />
                ) : null,
              )}
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full h-11 pl-11 pr-4 rounded-full border border-border bg-white text-sm focus:border-text focus:outline-none"
              />
            </form>

            <div className="flex items-center gap-3">
              <FilterDrawer activeCount={activeFilterCount}>{sidebar}</FilterDrawer>
              <Suspense
                fallback={<div className="w-40 h-11 bg-bg-secondary rounded-full" />}
              >
                <SortSelect defaultValue={sortValue} />
              </Suspense>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="text-sm text-text-secondary">
              Hiển thị <span className="font-medium text-text">{list.length}</span> sản phẩm
            </div>
            <div className="flex flex-wrap gap-2">
              {activeCategory && (
                <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-primary-50 text-xs text-primary-dark">
                  {activeCategory.name}
                  <Link
                    href={`/products${buildQueryString(params, { category: '' })}`}
                    aria-label="Xóa danh mục"
                    className="hover:text-text"
                  >
                    <X size={12} />
                  </Link>
                </span>
              )}
              {query && (
                <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-primary-50 text-xs text-primary-dark">
                  &quot;{query}&quot;
                  <Link
                    href={`/products${buildQueryString(params, { q: '' })}`}
                    aria-label="Xóa tìm kiếm"
                    className="hover:text-text"
                  >
                    <X size={12} />
                  </Link>
                </span>
              )}
            </div>
          </div>

          {list.length === 0 ? (
            <div className="text-center py-24">
              <div className="inline-grid place-items-center w-16 h-16 rounded-full bg-primary-50 text-primary mb-6">
                <ShoppingBag size={28} />
              </div>
              <h3 className="font-serif text-2xl font-medium text-text mb-2">Không tìm thấy sản phẩm</h3>
              <p className="text-text-secondary max-w-md mx-auto mb-8">
                Hãy thử bộ lọc khác hoặc xóa các điều kiện đã chọn để xem toàn bộ sản phẩm.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center justify-center h-11 px-8 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition"
              >
                Xem tất cả sản phẩm
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
