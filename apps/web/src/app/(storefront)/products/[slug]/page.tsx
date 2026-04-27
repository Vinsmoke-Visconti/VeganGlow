import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/components/products/AddToCartButton';
import Link from 'next/link';
import styles from './product-detail.module.css';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import { Leaf, Shield, Sparkles, Star, ShieldCheck } from 'lucide-react';
import { cacheGet, cacheSet } from '@/lib/redis';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient();
  const { slug } = await params;

  // 1. Try to get product from Redis Cache
  const cacheKey = `product:${slug}`;
  let product = await cacheGet<any>(cacheKey);

  if (!product) {
    // 2. If not in cache, fetch from Supabase
    const { data: dbProduct } = await supabase
      .from('products')
      .select(`
        *,
        categories:category_id (id, name, slug)
      `)
      .eq('slug', slug)
      .single();

    if (!dbProduct) {
      notFound();
    }
    
    product = dbProduct;
    // 3. Save to Redis Cache (expire in 1 hour)
    await cacheSet(cacheKey, product, 3600);
  }

  const typedProduct = product as any;

  // Fetch related products (with caching)
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
          <Link href="/">Trang chủ</Link> / 
          <Link href="/products">Sản phẩm</Link> / 
          <span>{typedProduct.name}</span>
        </nav>
      </FadeIn>

      <div className={styles.productGrid}>
        {/* Left: Image */}
        <FadeIn direction="right" delay={0.2} className={styles.imageGallery}>
          <div className={styles.mainImageWrap}>
            <img 
              src={typedProduct.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(typedProduct.name)}&background=B7E4C7&color=1B4332&size=600`} 
              alt={typedProduct.name} 
              className={styles.mainImage}
            />
          </div>
        </FadeIn>

        {/* Right: Info */}
        <FadeIn direction="left" delay={0.3} className={styles.infoPanel}>
          <span className={styles.categoryBadge}>{typedProduct.categories?.name || 'Skincare'}</span>
          <h1 className={styles.productTitle}>{typedProduct.name}</h1>
          
          <div className={styles.ratingRow}>
            <span className={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill={i < Math.round(typedProduct.rating || 5) ? "#fbbf24" : "none"} color={i < Math.round(typedProduct.rating || 5) ? "#fbbf24" : "#d1d5db"} />
              ))}
            </span>
            <span className={styles.reviewsCount}>({typedProduct.reviews_count || 0} đánh giá)</span>
          </div>

          <div className={styles.priceRow}>
            <span className={styles.price}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(typedProduct.price))}
            </span>
            {typedProduct.stock > 0 ? (
              <span className={styles.stockStatus}>Còn hàng ({typedProduct.stock})</span>
            ) : (
              <span className={styles.outOfStock}>Hết hàng</span>
            )}
          </div>

          <p className={styles.description}>
            {typedProduct.description || 'Sản phẩm tuyệt vời từ VeganGlow mang lại trải nghiệm làm đẹp thuần chay an toàn và hiệu quả.'}
          </p>

          <div className={styles.actions}>
            <AddToCartButton product={typedProduct} className={styles.fullWidthBtn} />
            <Link href="/checkout" className={styles.buyNowBtn}>Mua ngay</Link>
          </div>

          <div className={styles.features}>
            <div className={styles.featureItem}><Sparkles size={16} color="#10b981" /> 100% Thuần chay</div>
            <div className={styles.featureItem}><Leaf size={16} color="#10b981" /> Nguyên liệu tự nhiên</div>
            <div className={styles.featureItem}><ShieldCheck size={16} color="#10b981" /> Kiểm nghiệm da liễu</div>
          </div>
        </FadeIn>
      </div>

      {/* Details Tabs */}
      <FadeIn direction="up" delay={0.4}>
        <section className={styles.tabsSection}>
          <div className={styles.tabHeaders}>
            <button className={styles.tabHeaderActive}>Chi tiết sản phẩm</button>
            <button className={styles.tabHeader}>Thành phần</button>
            <button className={styles.tabHeader}>Hướng dẫn sử dụng</button>
          </div>
          <div className={styles.tabContent}>
            <div className={styles.tabPane}>
              <p>{typedProduct.description}</p>
              <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Thành phần chính:</h4>
              <p>{typedProduct.ingredients || 'Thành phần tự nhiên, an toàn cho da.'}</p>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Reviews Section */}
      <ReviewsSection productId={typedProduct.id} productRating={typedProduct.rating} reviewsCount={typedProduct.reviews_count} />

      {/* Related Products */}
      {typedRelated.length > 0 && (
        <FadeIn direction="up" delay={0.5}>
          <section className={styles.relatedSection}>
            <h2 className={styles.relatedTitle}>Sản phẩm tương tự</h2>
            <StaggerContainer className={styles.relatedGrid}>
              {typedRelated.map((p) => (
                <StaggerItem key={p.id}>
                  <Link href={`/products/${p.slug}`} className={styles.relatedCard}>
                    <img 
                      src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=B7E4C7&color=1B4332&size=300`} 
                      alt={p.name} 
                    />
                    <h3>{p.name}</h3>
                    <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(p.price))}</span>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        </FadeIn>
      )}
    </div>
  );
}

// Sub-component for Reviews (Can be moved to a separate file later)
async function ReviewsSection({ productId, productRating, reviewsCount }: { productId: string, productRating: number, reviewsCount: number }) {
  const supabase = await createClient();
  
  // 1. Fetch reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profiles(full_name, avatar_url)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  // 2. Check if user is logged in and has purchased
  const { data: { user } } = await supabase.auth.getUser();
  let hasPurchased = false;
  
  if (user) {
    const { data: purchase } = await supabase
      .from('order_items')
      .select('id, orders!inner(user_id, status)')
      .eq('product_id', productId)
      .eq('orders.user_id', user.id)
      .eq('orders.status', 'completed')
      .limit(1);
    
    if (purchase && purchase.length > 0) hasPurchased = true;
  }

  return (
    <section className={styles.reviewsSection}>
      <div className={styles.reviewsHeader}>
        <h2>Đánh giá từ khách hàng</h2>
        <div className={styles.ratingSummary}>
          <div className={styles.bigRating}>{Number(productRating).toFixed(1)}</div>
          <div className={styles.summaryMeta}>
            <div className={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill={i < Math.round(productRating) ? "#fbbf24" : "none"} color={i < Math.round(productRating) ? "#fbbf24" : "#d1d5db"} />
              ))}
            </div>
            <span>{reviewsCount} đánh giá</span>
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
                  <div className={styles.userName}>{review.profiles?.full_name || 'Khách hàng'}</div>
                  <div className={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>
              <div className={styles.reviewContent}>
                <div className={styles.itemStars}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < review.rating ? "#fbbf24" : "none"} color={i < review.rating ? "#fbbf24" : "#d1d5db"} />
                  ))}
                </div>
                <p>{review.comment}</p>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.noReviews}>Chưa có đánh giá nào cho sản phẩm này.</p>
        )}
      </div>

      {hasPurchased && (
        <div className={styles.reviewForm}>
          <h3>Viết đánh giá của bạn</h3>
          <form action="/api/reviews" method="POST">
            <input type="hidden" name="productId" value={productId} />
            <div className={styles.formGroup}>
              <label>Số sao</label>
              <select name="rating" required className={styles.select}>
                <option value="5">5 sao - Rất tốt</option>
                <option value="4">4 sao - Tốt</option>
                <option value="3">3 sao - Bình thường</option>
                <option value="2">2 sao - Không tốt</option>
                <option value="1">1 sao - Tệ</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Bình luận</label>
              <textarea name="comment" required placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..." rows={4} className={styles.textarea}></textarea>
            </div>
            <button type="submit" className={styles.submitBtn}>Gửi đánh giá</button>
          </form>
        </div>
      )}
    </section>
  );
}


