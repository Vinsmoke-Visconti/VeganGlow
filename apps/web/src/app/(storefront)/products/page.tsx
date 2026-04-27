import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AddToCartButton from '@/components/products/AddToCartButton';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import { Filter, Search, Star, X, Leaf, ShoppingBag } from 'lucide-react';
import styles from './products.module.css';
import { SortSelect } from './SortSelect';

export const revalidate = 3600;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất', column: 'created_at', ascending: false },
  { value: 'price-asc', label: 'Giá: Thấp → Cao', column: 'price', ascending: true },
  { value: 'price-desc', label: 'Giá: Cao → Thấp', column: 'price', ascending: false },
  { value: 'rating', label: 'Đánh giá tốt nhất', column: 'rating', ascending: false },
  { value: 'popular', label: 'Bán chạy', column: 'reviews_count', ascending: false },
] as const;

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
  const minPrice = typeof params.min === 'string' ? Number(params.min) : NaN;
  const maxPrice = typeof params.max === 'string' ? Number(params.max) : NaN;
  const sortValue = typeof params.sort === 'string' ? params.sort : 'newest';
  const sort = SORT_OPTIONS.find((s) => s.value === sortValue) || SORT_OPTIONS[0];

  // Categories with product counts
  const { data: catData } = await supabase
    .from('categories')
    .select('id, name, slug, products(count)')
    .order('name');

  type CatRow = { id: string; name: string; slug: string; products?: { count: number }[] };
  const categories = ((catData as CatRow[]) || []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    count: c.products?.[0]?.count ?? 0,
  }));
  const totalCount = categories.reduce((s, c) => s + c.count, 0);
  const activeCategory = categories.find((c) => c.slug === categorySlug);

  // Products query
  let dbQuery = supabase.from('products').select('*, categories!inner(name, slug)');
  if (query) dbQuery = dbQuery.ilike('name', `%${query}%`);
  if (activeCategory) dbQuery = dbQuery.eq('category_id', activeCategory.id);
  if (Number.isFinite(minPrice)) dbQuery = dbQuery.gte('price', minPrice);
  if (Number.isFinite(maxPrice)) dbQuery = dbQuery.lte('price', maxPrice);
  dbQuery = dbQuery.order(sort.column, { ascending: sort.ascending });

  const { data: products, error } = await dbQuery;
  if (error) console.error('Products query error:', error);

  type Product = {
    id: string;
    slug: string;
    name: string;
    image: string | null;
    price: number | string;
    rating: number | null;
    reviews_count: number | null;
    stock: number;
    categories?: { name: string; slug: string };
  };

  const list = (products as Product[]) || [];

  const formatVND = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  return (
    <div className={styles.page}>
      <FadeIn direction="down">
        <header className={styles.header}>
          <span className={styles.eyebrow}>
            <Leaf size={12} /> Bộ sưu tập VeganGlow
          </span>
          <h1 className={styles.title}>Tất cả sản phẩm</h1>
          <p className={styles.subtitle}>
            Khám phá bộ sưu tập mỹ phẩm thuần chay được chế tác từ thảo dược Việt Nam — an
            toàn cho da, dịu dàng với địa cầu.
          </p>
        </header>
      </FadeIn>

      <div className={styles.layout}>
        {/* ── Sidebar filters ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>
            <Filter size={14} />
            Bộ lọc
            {(activeCategory || query || Number.isFinite(minPrice) || Number.isFinite(maxPrice)) && (
              <Link href="/products" className={styles.resetBtn} style={{ marginLeft: 'auto' }}>
                <X size={12} /> Xóa lọc
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
            <div className={styles.filterLabel}>Khoảng giá (VNĐ)</div>
            <form action="/products" method="GET" className={styles.priceRange}>
              {/* Preserve other filters */}
              {Object.entries(params).map(([k, v]) =>
                typeof v === 'string' && k !== 'min' && k !== 'max' ? (
                  <input key={k} type="hidden" name={k} value={v} />
                ) : null,
              )}
              <div className={styles.priceInputs}>
                <input
                  type="number"
                  name="min"
                  placeholder="Tối thiểu"
                  defaultValue={Number.isFinite(minPrice) ? minPrice : ''}
                  className={styles.priceInput}
                  min="0"
                />
                <span className={styles.priceDash}>—</span>
                <input
                  type="number"
                  name="max"
                  placeholder="Tối đa"
                  defaultValue={Number.isFinite(maxPrice) ? maxPrice : ''}
                  className={styles.priceInput}
                  min="0"
                />
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
              {/* Preserve other filters except q */}
              {Object.entries(params).map(([k, v]) =>
                typeof v === 'string' && k !== 'q' ? (
                  <input key={k} type="hidden" name={k} value={v} />
                ) : null,
              )}
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Tìm kiếm sản phẩm..."
                className={styles.searchInput}
              />
            </form>

            <SortSelect defaultValue={sortValue} />
          </div>

          <div className={styles.resultsBar}>
            <div className={styles.resultsCount}>
              <strong>{list.length}</strong> sản phẩm
              {activeCategory && ` trong danh mục "${activeCategory.name}"`}
              {query && ` cho "${query}"`}
            </div>
            <div className={styles.activeFilters}>
              {activeCategory && (
                <span className={styles.filterChip}>
                  {activeCategory.name}
                  <Link href={`/products${buildQueryString(params, { category: '' })}`}>
                    <X size={12} />
                  </Link>
                </span>
              )}
              {query && (
                <span className={styles.filterChip}>
                  &quot;{query}&quot;
                  <Link href={`/products${buildQueryString(params, { q: '' })}`}>
                    <X size={12} />
                  </Link>
                </span>
              )}
              {(Number.isFinite(minPrice) || Number.isFinite(maxPrice)) && (
                <span className={styles.filterChip}>
                  {Number.isFinite(minPrice) ? formatVND(minPrice) : '0'} —{' '}
                  {Number.isFinite(maxPrice) ? formatVND(maxPrice) : '∞'}
                  <Link href={`/products${buildQueryString(params, { min: '', max: '' })}`}>
                    <X size={12} />
                  </Link>
                </span>
              )}
            </div>
          </div>

          {list.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <ShoppingBag size={28} />
              </div>
              <h3 className={styles.emptyTitle}>Không tìm thấy sản phẩm</h3>
              <p className={styles.emptyDesc}>
                Hãy thử bộ lọc khác hoặc xóa các điều kiện đã chọn để xem toàn bộ sản phẩm.
              </p>
              <Link href="/products" className={styles.applyBtn} style={{ display: 'inline-block' }}>
                Xem tất cả sản phẩm
              </Link>
            </div>
          ) : (
            <StaggerContainer className={styles.grid}>
              {list.map((p) => {
                const price = Number(p.price);
                const isOut = p.stock <= 0;
                return (
                  <StaggerItem key={p.id} className={styles.card}>
                    <Link href={`/products/${p.slug}`} className={styles.imageWrap}>
                      <img
                        src={
                          p.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=B7E4C7&color=1B4332&size=400`
                        }
                        alt={p.name}
                        className={styles.image}
                      />
                      {isOut && <div className={styles.outOfStock}>Hết hàng</div>}
                      {!isOut && p.stock < 5 && (
                        <span className={styles.badge}>Sắp hết</span>
                      )}
                    </Link>
                    <div className={styles.cardBody}>
                      {p.categories?.name && (
                        <span className={styles.category}>{p.categories.name}</span>
                      )}
                      <Link href={`/products/${p.slug}`}>
                        <h3 className={styles.name}>{p.name}</h3>
                      </Link>
                      <div className={styles.meta}>
                        <span className={styles.rating}>
                          <Star size={12} fill="currentColor" /> {Number(p.rating || 0).toFixed(1)}
                        </span>
                        <span>· {p.reviews_count || 0} đánh giá</span>
                      </div>
                      <div className={styles.footer}>
                        <span className={styles.price}>{formatVND(price)}</span>
                        {!isOut && (
                          <AddToCartButton product={p} className={styles.cartBtn} />
                        )}
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>
      </div>
    </div>
  );
}
