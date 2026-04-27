import styles from './page.module.css';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AddToCartButton from '@/components/products/AddToCartButton';
import { Database } from '@/types/database';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import { ArrowRight, Leaf, Shield, Heart, Sparkles } from 'lucide-react';
import { cacheGet, cacheSet } from '@/lib/redis';

export default async function Home() {
  const supabase = await createClient();

  // 1. Try to get featured products from Redis
  const cacheKey = 'featured_products';
  let products = await cacheGet<any[]>(cacheKey);

  if (!products) {
    // 2. If not in cache, fetch from Supabase
    const { data: dbProducts } = await supabase.from('products').select('*').limit(4);
    products = dbProducts || [];
    
    // 3. Save to Redis Cache (expire in 30 minutes)
    await cacheSet(cacheKey, products, 1800);
  }


  return (
    <div className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <FadeIn direction="down" delay={0.1}>
            <div className={styles.heroBadge}>
              <Sparkles size={16} className="inline mr-2" />
              Khám phá Vẻ Đẹp Thuần Chay
            </div>
          </FadeIn>
          
          <FadeIn direction="up" delay={0.2}>
            <h1 className={styles.heroTitle}>
              Nuôi Dưỡng Làn Da <br/>
              Từ <span className={styles.heroAccent}>Thiên Nhiên</span>
            </h1>
          </FadeIn>
          
          <FadeIn direction="up" delay={0.3}>
            <p className={styles.heroDescription}>
              Sản phẩm mỹ phẩm 100% thuần chay, kết tinh từ những nguyên liệu tự nhiên tốt nhất của Việt Nam, mang lại vẻ đẹp bền vững và an toàn tuyệt đối.
            </p>
          </FadeIn>
          
          <FadeIn direction="up" delay={0.4}>
            <div className={styles.heroActions}>
              <Link href="/products" className={styles.btnPrimary}>
                Mua sắm ngay <ArrowRight size={18} />
              </Link>
              <Link href="/about" className={styles.btnSecondary}>Tìm hiểu thêm</Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <div className="container">
        {/* Categories Section */}
        <FadeIn direction="up">
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Danh Mục Sản Phẩm</h2>
            <p className={styles.sectionSubtitle}>Dành riêng cho từng nhu cầu của làn da</p>
            <StaggerContainer className={styles.categoriesGrid}>
              {['Serum', 'Toner', 'Mặt Nạ', 'Sữa Rửa Mặt', 'Kem Dưỡng'].map((cat, i) => (
                <StaggerItem key={i} className={styles.categoryCard}>
                  <div className={styles.categoryIcon}><Leaf size={24} color="#10b981" /></div>
                  <span className={styles.categoryName}>{cat}</span>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        </FadeIn>

        {/* Featured Products */}
        <FadeIn direction="up">
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Sản Phẩm Nổi Bật</h2>
            <p className={styles.sectionSubtitle}>Những sản phẩm được yêu thích nhất</p>
            <StaggerContainer className={styles.productsGrid}>
              {products && products.length > 0 ? (
                products.map((p: any) => (
                  <StaggerItem key={p.id} className={styles.productCard}>
                    <Link href={`/products/${p.slug}`} className={styles.productImageWrap}>
                      <div className={styles.productBadge}>Best Seller</div>
                      <img 
                        src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=B7E4C7&color=1B4332&size=400`} 
                        alt={p.name} 
                        className={styles.productImage} 
                      />
                    </Link>
                    <div className={styles.productInfo}>
                      <span className={styles.productCategory}>Skincare</span>
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
            <div className={styles.viewAll}>
              <Link href="/products" className={styles.btnSecondary}>Xem tất cả sản phẩm</Link>
            </div>
          </section>
        </FadeIn>
      </div>


      {/* Why Choose Us */}
      <section className={styles.whySection}>
        <div className="container">
          <FadeIn direction="up">
            <StaggerContainer className={styles.whyGrid}>
              <StaggerItem className={styles.whyCard}>
                <span className={styles.whyIcon}><Leaf size={32} color="#10b981" /></span>
                <h3>100% Thuần Chay</h3>
                <p>Cam kết không sử dụng thành phần từ động vật và không thử nghiệm trên động vật.</p>
              </StaggerItem>
              <StaggerItem className={styles.whyCard}>
                <span className={styles.whyIcon}><Shield size={32} color="#10b981" /></span>
                <h3>Chuẩn Y Khoa</h3>
                <p>Được nghiên cứu và kiểm nghiệm da liễu, an toàn cho cả làn da nhạy cảm nhất.</p>
              </StaggerItem>
              <StaggerItem className={styles.whyCard}>
                <span className={styles.whyIcon}><Heart size={32} color="#10b981" /></span>
                <h3>Nguyên Liệu Việt Nam</h3>
                <p>Chắt lọc tinh túy từ rau má, diếp cá, hoa đậu biếc và các loại thảo mộc địa phương.</p>
              </StaggerItem>
            </StaggerContainer>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
