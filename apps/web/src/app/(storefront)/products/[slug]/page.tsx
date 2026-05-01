import AddToCartButton from '@/components/products/AddToCartButton';
import ProductCard from '@/components/products/ProductCard';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import { cacheGet, cacheSet } from '@/lib/redis';
import { createClient } from '@/lib/supabase/server';
import { Beaker, CheckCircle2, Clock, Heart, Info, Leaf, RefreshCw, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './product-detail.module.css';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient();
  const { slug } = await params;

  const cacheKey = `product:${slug}`;
  let product = await cacheGet<any>(cacheKey);

  if (!product) {
    const { data: dbProduct } = await supabase
      .from('products')
      .select(`
        *,
        categories:category_id (id, name, slug)
      `)
      .eq('slug', slug)
      .single();

    if (!dbProduct) notFound();
    product = dbProduct;
    await cacheSet(cacheKey, product, 3600);
  }

  const typedProduct = product as any;

  // Fetch related products
  const relatedCacheKey = `related:${typedProduct.category_id}:${typedProduct.id}`;
  let relatedProducts = await cacheGet<any[]>(relatedCacheKey);

  if (!relatedProducts) {
    const { data: dbRelated } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', typedProduct.category_id)
      .neq('id', typedProduct.id)
      .limit(4);

    relatedProducts = dbRelated || [];
    await cacheSet(relatedCacheKey, relatedProducts, 3600);
  }

  const typedRelated = (relatedProducts || []) as any[];

  return (
    <div className={styles.container}>
      <FadeIn direction="down" delay={0.1}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <Link href="/products">Sản phẩm</Link>
          <span>/</span>
          <Link href={`/products?category=${typedProduct.categories?.slug}`}>
            {typedProduct.categories?.name || 'Skincare'}
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--color-primary-dark)', fontWeight: 800 }}>{typedProduct.name}</span>
        </nav>
      </FadeIn>

      <div className={styles.productGrid}>
        {/* Left: Image Gallery */}
        <FadeIn direction="right" delay={0.2} className={styles.imageGallery}>
          <div className={styles.mainImageWrap}>
            <img
              src={typedProduct.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(typedProduct.name)}&background=B7E4C7&color=1B4332&size=800`}
              alt={typedProduct.name}
              className={styles.mainImage}
            />
          </div>
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <Leaf size={16} /> 100% Thuần Chay
            </div>
            <div className={styles.trustBadge}>
              <ShieldCheck size={16} /> Kiểm nghiệm y khoa
            </div>
            <div className={styles.trustBadge}>
              <Sparkles size={16} /> Không hóa chất độc hại
            </div>
          </div>
        </FadeIn>

        {/* Right: Info Panel */}
        <FadeIn direction="left" delay={0.3} className={styles.infoPanel}>
          <div className={styles.categoryBadge}>{typedProduct.categories?.name || 'Skincare'}</div>
          <h1 className={styles.productTitle}>{typedProduct.name}</h1>
          <div className={styles.sku}>SKU: VG-{typedProduct.id.substring(0, 6).toUpperCase()}</div>

          <div className={styles.ratingRow}>
            <div className={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill={i < Math.round(typedProduct.rating || 5) ? "#fbbf24" : "none"} color={i < Math.round(typedProduct.rating || 5) ? "#fbbf24" : "#d1d5db"} />
              ))}
            </div>
            <span className={styles.reviewsCount}>{typedProduct.reviews_count || 0} Đánh giá từ khách hàng</span>
          </div>

          <div className={styles.priceRow}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                <span className={styles.price}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(typedProduct.price))}
                </span>
                {typedProduct.original_price && (
                  <>
                    <span className={styles.oldPrice}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(typedProduct.original_price))}</span>
                    <span className={styles.discount}>-{Math.round(((typedProduct.original_price - typedProduct.price) / typedProduct.original_price) * 100)}%</span>
                  </>
                )}
              </div>
            </div>

            <div className={styles.stockStatus}>
              {typedProduct.stock > 10 ? (
                <><CheckCircle2 size={16} /> Còn hàng</>
              ) : typedProduct.stock > 0 ? (
                <span className={styles.lowStock}><Clock size={16} /> Sắp hết hàng</span>
              ) : (
                <span className={styles.outOfStock}>Hết hàng</span>
              )}
            </div>
          </div>

          <p className={styles.description}>
            {typedProduct.description || 'Sản phẩm tuyệt vời từ VeganGlow mang lại trải nghiệm làm đẹp thuần chay an toàn và hiệu quả. Được chiết xuất 100% từ thực vật địa phương.'}
          </p>

          <div className={styles.actions}>
            <AddToCartButton product={typedProduct} className={styles.fullWidthBtn} />
            <Link href="/checkout" className={styles.buyNowBtn}>Mua ngay</Link>
          </div>

          <div className={styles.benefits}>
            <h4 className={styles.benefitTitle}>Lợi ích nổi bật:</h4>
            <ul className={styles.benefitList}>
              <li><CheckCircle2 size={16} color="var(--color-primary)" /> Thành phần 100% thảo mộc tự nhiên Việt Nam</li>
              <li><CheckCircle2 size={16} color="var(--color-primary)" /> Không chứa Paraben, Sulfate và Silicone</li>
              <li><CheckCircle2 size={16} color="var(--color-primary)" /> An toàn cho phụ nữ mang thai và da nhạy cảm</li>
            </ul>
          </div>

          <div className={styles.features}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}><Truck size={20} /></div>
              Giao hỏa tốc
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}><RefreshCw size={20} /></div>
              7 Ngày đổi trả
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}><Heart size={20} /></div>
              Yêu thích
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Detailed Content Sections */}
      <FadeIn direction="up" delay={0.4}>
        <section className={styles.tabsSection}>
          <div className={styles.tabHeaders}>
            <button className={styles.tabHeaderActive}>Thông tin chi tiết</button>
            <button className={styles.tabHeader}>Thành phần</button>
            <button className={styles.tabHeader}>Cách sử dụng</button>
          </div>
          <div className={styles.tabContent}>
            <div className={styles.detailGrid}>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}><Info size={24} /></div>
                <div>
                  <h4>Về sản phẩm</h4>
                  <p>{typedProduct.description}</p>
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}><Beaker size={24} /></div>
                <div>
                  <h4>Thành phần chính</h4>
                  <p>{typedProduct.ingredients || 'Thành phần thiên nhiên lành tính, tinh khiết.'}</p>
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}><Clock size={24} /></div>
                <div>
                  <h4>Hướng dẫn sử dụng</h4>
                  <p>Làm sạch da, lấy một lượng vừa đủ thoa đều lên vùng da cần chăm sóc. Sử dụng 2 lần mỗi ngày (sáng và tối) để đạt hiệu quả tốt nhất.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Reviews Section */}
      <ReviewsSection productId={typedProduct.id} productRating={typedProduct.rating} reviewsCount={typedProduct.reviews_count} />

      {/* Related Products Section */}
      {typedRelated.length > 0 && (
        <section className={styles.relatedSection}>
          <FadeIn direction="up">
            <h2 className={styles.relatedTitle}>Bạn cũng có thể thích</h2>
            <StaggerContainer className={styles.relatedGrid}>
              {typedRelated.map((p) => (
                <StaggerItem key={p.id}>
                  <ProductCard product={p} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </FadeIn>
        </section>
      )}
    </div>
  );
}

// Sub-components
async function ReviewsSection({ productId, productRating, reviewsCount }: { productId: string, productRating: number, reviewsCount: number }) {
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profiles(full_name, avatar_url)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  return (
    <section className={styles.reviewsSection}>
      <div className={styles.reviewsHeader}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>Đánh giá thực tế</h2>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Tất cả đánh giá từ người dùng đã mua hàng</p>
        </div>
        <div className={styles.ratingSummary}>
          <div className={styles.bigRating}>{Number(productRating || 5).toFixed(1)}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} fill={i < Math.round(productRating || 5) ? "#fbbf24" : "none"} color={i < Math.round(productRating || 5) ? "#fbbf24" : "#d1d5db"} />
              ))}
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: '0.25rem' }}>{reviewsCount || 0} Đánh giá</span>
          </div>
        </div>
      </div>

      <div className={styles.reviewsList}>
        {reviews && reviews.length > 0 ? (
          reviews.map((review: any) => (
            <div key={review.id} className={styles.reviewItem}>
              <div className={styles.reviewUser}>
                <img src={review.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.profiles?.full_name || 'U')}`} alt="User" />
                <div>
                  <div className={styles.userName}>{review.profiles?.full_name || 'Khách hàng ẩn danh'}</div>
                  <div className={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>
              <div className={styles.reviewContent}>
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', color: '#fbbf24' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} />
                  ))}
                </div>
                <p>{review.comment}</p>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Sản phẩm chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm!</p>
          </div>
        )}
      </div>
    </section>
  );
}
