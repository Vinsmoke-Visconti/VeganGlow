import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AddToCartButton from '@/components/products/AddToCartButton';
import styles from '../page.module.css'; // Reusing styles from home page for now
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import { Filter, Search } from 'lucide-react';

// Add Distributed Cache Configuration (ISR - Incremental Static Regeneration)
// This tells Vercel's Edge CDN to cache this page for 1 hour (3600 seconds)
export const revalidate = 3600;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  
  const query = typeof params?.q === 'string' ? params.q : '';


  let dbQuery = supabase
    .from('products')
    .select('*, categories(name)');

  if (query) {
    // Distributed Search Index via Supabase Postgres FTS (Full Text Search)
    dbQuery = dbQuery.textSearch('name', query, {
      type: 'websearch',
      config: 'english' // or simple, based on setup
    });
  } else {
    dbQuery = dbQuery.order('created_at', { ascending: false });
  }

  const { data: products, error } = await dbQuery;

  if (error) {
    console.error('Search error:', error);
  }

  return (
    <div className="container" style={{ padding: '4rem 1rem' }}>
      <FadeIn direction="down">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 className={styles.sectionTitle}>Tất cả sản phẩm</h1>
          <p className={styles.sectionSubtitle}>Khám phá bộ sưu tập mỹ phẩm thuần chay từ VeganGlow</p>
        </div>
      </FadeIn>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <FadeIn direction="right" delay={0.1}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className={styles.btnSecondary} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} /> Lọc
            </button>
          </div>
        </FadeIn>
        
        <FadeIn direction="left" delay={0.1}>
          <form action="/products" method="GET" style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type="text" 
              name="q"
              defaultValue={query}
              placeholder="Tìm kiếm sản phẩm..." 
              style={{ padding: '0.5rem 1rem 0.5rem 2.5rem', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
            />
          </form>
        </FadeIn>
      </div>

      <StaggerContainer className={styles.productsGrid}>
        {products && products.length > 0 ? (
          products.map((p: any) => (
            <StaggerItem key={p.id} className={styles.productCard}>
              <Link href={`/products/${p.slug}`} className={styles.productImageWrap}>
                <img 
                  src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=B7E4C7&color=1B4332&size=400`} 
                  alt={p.name} 
                  className={styles.productImage} 
                />
              </Link>
              <div className={styles.productInfo}>
                <span className={styles.productCategory}>{p.categories?.name || 'Skincare'}</span>
                <Link href={`/products/${p.slug}`}>
                  <h3 className={styles.productName}>{p.name}</h3>
                </Link>
                <div className={styles.productMeta}>
                  <span className={styles.productRating}>★ {p.rating}</span>
                  <span className={styles.productReviews}>({p.reviews_count} đánh giá)</span>
                </div>
                <div className={styles.productFooter}>
                  <span className={styles.productPrice}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(p.price))}
                  </span>
                  <AddToCartButton product={p} className={styles.miniCartBtn} />
                </div>
              </div>
            </StaggerItem>
          ))
        ) : (
          <p>Chưa có sản phẩm.</p>
        )}
      </StaggerContainer>
    </div>
  );
}
