import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/products/ProductCard';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import { Filter, Search, X, Leaf, ShoppingBag } from 'lucide-react';
import styles from './products.module.css';
import SortSelect from '@/components/products/SortSelect';
import { SORT_OPTIONS, PRICE_BRACKETS } from './constants';

// For development and testing, we disable strict revalidation to ensure data is fresh.
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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const query = typeof params.q === 'string' ? params.q : '';
  const categorySlug = typeof params.category === 'string' ? params.category : '';
  const minPrice = typeof params.min === 'string' && params.min !== '' ? Number(params.min) : NaN;
  const maxPrice = typeof params.max === 'string' && params.max !== '' ? Number(params.max) : NaN;
  const sortValue = typeof params.sort === 'string' ? params.sort : 'newest';
  const sort = SORT_OPTIONS.find((s) => s.value === sortValue) || SORT_OPTIONS[0];

  // 1. Fetch Categories and all active products to compute counts accurately in-memory
  // This avoids complex nested Supabase filtering for counts.
  const [categoriesRes, allActiveProductsRes] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    supabase.from('products').select('category_id').eq('is_active', true)
  ]);

  const rawCategories = (categoriesRes.data as any[]) || [];
  const activeProductRows = (allActiveProductsRes.data as any[]) || [];

  const categories = rawCategories.map(cat => ({
    ...cat,
    count: activeProductRows.filter(p => p.category_id === cat.id).length
  }));

  const totalCount = activeProductRows.length;
  const activeCategory = categories.find((c) => c.slug === categorySlug);

  // 2. Build the main products query
  let dbQuery = supabase
    .from('products')
    .select('*, categories!inner(name, slug)')
    .eq('is_active', true);

  if (query) {
    dbQuery = dbQuery.ilike('name', `%${query}%`);
  }

  if (categorySlug) {
    // Note: Filtering on the joined table's slug
    dbQuery = dbQuery.eq('categories.slug', categorySlug);
  }

  if (!isNaN(minPrice)) {
    dbQuery = dbQuery.gte('price', minPrice);
  }

  if (!isNaN(maxPrice)) {
    dbQuery = dbQuery.lte('price', maxPrice);
  }

  dbQuery = dbQuery.order(sort.column, { ascending: sort.ascending });

  const { data: products, error } = await dbQuery;
  if (error) {
    console.error('Products query error:', error);
  }

  const list = (products as any[]) || [];

  return (
    <div className={styles.page}>
      <FadeIn direction="down">
        <header className={styles.header}>
          <span className={styles.eyebrow}>
            <Leaf size={14} /> Bộ sưu tập VeganGlow
          </span>
          <h1 className={styles.title}>Tất cả sản phẩm</h1>
          <p className={styles.subtitle}>
            Khám phá bộ sưu tập mỹ phẩm thuần chay tinh khiết từ thảo dược Việt Nam.
          </p>
        </header>
      </FadeIn>

      <div className={styles.layout}>
        {/* ── Sidebar filters ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>
            <Filter size={18} />
            Bộ lọc
            {(activeCategory || query || Number.isFinite(minPrice) || Number.isFinite(maxPrice)) && (
              <Link href="/products" className={styles.resetBtn} style={{ marginLeft: 'auto' }}>
                <X size={14} /> Xóa lọc
              </Link>
            )}
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterLabel}>Danh mục</div>
            <div className={styles.categoryList}>
              <Link
                href={`/products${buildQueryString(params, { category: '' })}`}
                className={`${styles.categoryItem} ${!activeCategory ? styles.categoryItemActive : ''}`}
              >
                <span>Tất cả</span>
                <span className={styles.categoryCount}>{totalCount}</span>
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/products${buildQueryString(params, { category: c.slug })}`}
                  className={`${styles.categoryItem} ${
                    activeCategory?.id === c.id ? styles.categoryItemActive : ''
                  }`}
                >
                  <span>{c.name}</span>
                  <span className={styles.categoryCount}>{c.count}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterLabel}>Khoảng giá</div>
            <div className={styles.priceBrackets}>
              {PRICE_BRACKETS.map((bracket, idx) => {
                const isActive = (minPrice === bracket.min && (maxPrice === bracket.max || (bracket.max === Infinity && !Number.isFinite(maxPrice))));
                return (
                  <Link
                    key={idx}
                    href={`/products${buildQueryString(params, { 
                      min: bracket.min.toString(), 
                      max: bracket.max === Infinity ? '' : bracket.max.toString() 
                    })}`}
                    className={`${styles.priceBracket} ${isActive ? styles.priceBracketActive : ''}`}
                  >
                    {bracket.label}
                  </Link>
                );
              })}
            </div>
            
            <form action="/products" method="GET" className={styles.priceRange}>
              {Object.entries(params).map(([k, v]) =>
                typeof v === 'string' && k !== 'min' && k !== 'max' ? (
                  <input key={k} type="hidden" name={k} value={v} />
                ) : null,
              )}
              <div className={styles.priceInputs}>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    name="min"
                    placeholder="Tối thiểu"
                    defaultValue={Number.isFinite(minPrice) ? minPrice : ''}
                    className={styles.priceInput}
                    min="0"
                  />
                  <span className={styles.unit}>₫</span>
                </div>
                <span className={styles.priceDash}>—</span>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    name="max"
                    placeholder="Tối đa"
                    defaultValue={Number.isFinite(maxPrice) ? maxPrice : ''}
                    className={styles.priceInput}
                    min="0"
                  />
                  <span className={styles.unit}>₫</span>
                </div>
              </div>
              <button type="submit" className={styles.applyBtn}>
                Áp dụng
              </button>
            </form>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div>
          <div className={styles.toolbar}>
            <form action="/products" method="GET" className={styles.searchForm}>
              {Object.entries(params).map(([k, v]) =>
                typeof v === 'string' && k !== 'q' ? (
                  <input key={k} type="hidden" name={k} value={v} />
                ) : null,
              )}
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Tìm kiếm sản phẩm..."
                className={styles.searchInput}
              />
            </form>

            <Suspense fallback={<div style={{ width: '160px', height: '40px', backgroundColor: 'var(--color-bg-alt)', borderRadius: '8px' }} />}>
              <SortSelect defaultValue={sortValue} />
            </Suspense>
          </div>

          <div className={styles.resultsBar}>
            <div className={styles.resultsCount}>
              Hiển thị <strong>{list.length}</strong> sản phẩm
            </div>
            <div className={styles.activeFilters}>
              {activeCategory && (
                <span className={styles.filterChip}>
                  {activeCategory.name}
                  <Link href={`/products${buildQueryString(params, { category: '' })}`}>
                    <X size={14} />
                  </Link>
                </span>
              )}
              {query && (
                <span className={styles.filterChip}>
                  &quot;{query}&quot;
                  <Link href={`/products${buildQueryString(params, { q: '' })}`}>
                    <X size={14} />
                  </Link>
                </span>
              )}
            </div>
          </div>

          {list.length === 0 ? (
            <FadeIn>
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                  <ShoppingBag size={40} />
                </div>
                <h3 className={styles.emptyTitle}>Không tìm thấy sản phẩm</h3>
                <p className={styles.emptyDesc}>
                  Hãy thử bộ lọc khác hoặc xóa các điều kiện đã chọn để xem toàn bộ sản phẩm.
                </p>
                <Link href="/products" className={styles.applyBtn} style={{ display: 'inline-block', width: 'auto', padding: '0.75rem 2rem' }}>
                  Xem tất cả sản phẩm
                </Link>
              </div>
            </FadeIn>
          ) : (
            <StaggerContainer className={styles.grid}>
              {list.map((p) => (
                <StaggerItem key={p.id}>
                  <ProductCard product={p} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </div>
    </div>
  );
}
