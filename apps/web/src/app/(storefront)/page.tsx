import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | VeganGlow - Mỹ phẩm Thuần Chay',
    default: 'VeganGlow | Vẻ Đẹp Thuần Chay Từ Thiên Nhiên Việt Nam',
  },
  description: 'VeganGlow cung cấp các sản phẩm mỹ phẩm 100% thuần chay, an toàn và bền vững, được chiết xuất từ những nguyên liệu tự nhiên tinh túy nhất của Việt Nam.',
  keywords: ['mỹ phẩm thuần chay', 'vegan skincare', 'skincare Việt Nam', 'làm đẹp tự nhiên'],
  authors: [
    { name: 'Trần Thảo My' },
    { name: 'Huỳnh Nguyễn Quốc Việt' },
    { name: 'Phạm Hoài Thương' },
    { name: 'Trần Quỳnh Trâm' },
  ],
};

import styles from './page.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import { ArrowRight, Leaf, Shield, Heart, Sparkles, Star, Users, Award, Recycle, Quote, TrendingUp } from 'lucide-react';
import ProductCard, { type ProductCardProduct } from '@/components/products/ProductCard';
import { cacheGet, cacheSet } from '@/lib/redis';

type TestimonialRow = {
  id: string;
  name: string;
  role: string;
  rating: number;
  text: string;
  avatar_initials: string;
};

import BestSellers from '@/components/products/BestSellers';

export default async function Home() {
  const supabase = await createClient();

  const cacheKey = 'best_selling_products';
  let bestSellers = await cacheGet<ProductCardProduct[]>(cacheKey);

  if (!bestSellers) {
    const { data: bestSellersData } = await (supabase.rpc as any)('get_best_selling_products', {
      p_days_ago: 30,
      p_limit: 20
    });
    
    bestSellers = (bestSellersData as any[] | null)?.map(p => ({
      ...p,
      categories: { name: 'Bán chạy', slug: 'best-seller' }
    })) ?? [];

    await cacheSet(cacheKey, bestSellers, 1800);
  }

  const { data: testimonialsData, error: testimonialsError } = await supabase
    .from('testimonials')
    .select('id,name,role,rating,text,avatar_initials')
    .eq('is_active', true)
    .order('display_order');

  const FEATURED_CATEGORIES = [
    { slug: 'chong-nang', name: 'Chống nắng', image: '/images/categories/sunscreen.jpg', description: 'Bảo vệ toàn diện trước tia UV', size: 'large' },
    { slug: 'serum', name: 'Serum', image: '/images/categories/serum.jpg', description: 'Tinh túy phục hồi', size: 'small' },
    { slug: 'mat-na', name: 'Mặt nạ', image: '/images/categories/mask.jpg', description: 'Thư giãn sâu', size: 'small' },
    { slug: 'duong-the', name: 'Dưỡng thể', image: '/images/categories/body-care.jpg', description: 'Mịn màng toàn thân mỗi ngày', size: 'medium' },
  ];

  const testimonials: TestimonialRow[] =
    !testimonialsError && testimonialsData && testimonialsData.length > 0
      ? (testimonialsData as unknown as TestimonialRow[])
      : [];

  return (
    <div className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroLayout}>
          <div className={styles.heroContent}>
            <FadeIn direction="down" delay={0.1}>
              <div className={styles.heroBadge}>
                <Sparkles size={16} />
                Khám phá Vẻ Đẹp Thuần Chay
              </div>
            </FadeIn>

            <FadeIn direction="up" delay={0.2}>
              <h1 className={styles.heroTitle}>
                Đánh Thức Vẻ Đẹp <br />
                Bằng <span className={styles.heroAccent}>Sự Thuần Khiết</span>
              </h1>
            </FadeIn>

            <FadeIn direction="up" delay={0.3}>
              <p className={styles.heroDescription}>
                Sản phẩm mỹ phẩm 100% thuần chay, kết tinh từ những nguyên liệu tự nhiên tốt nhất
                của Việt Nam, mang lại vẻ đẹp bền vững và an toàn tuyệt đối.
              </p>
            </FadeIn>

            <FadeIn direction="up" delay={0.4}>
              <div className={styles.heroActions}>
                <Link href="/products" className={styles.btnPrimary}>
                  Mua sắm ngay <ArrowRight size={18} />
                </Link>
                <Link href="/about" className={styles.btnSecondary}>
                  Tìm hiểu thêm
                </Link>
              </div>
            </FadeIn>

            <FadeIn direction="up" delay={0.5}>
              <div className={styles.heroTrust}>
                <span className={styles.heroStars}>★★★★★</span>
                <span>
                  Được tin dùng bởi <strong>10,000+</strong> khách hàng
                </span>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.35}>
            <div className={styles.heroImageWrap}>
              <Image
                src="/images/hero.jpg"
                alt="VeganGlow – Skincare thuần chay từ thiên nhiên Việt Nam"
                width={800}
                height={800}
                className={styles.heroImage}
                priority
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section className={styles.trustBar} style={{ position: 'relative', overflow: 'hidden' }}>
        <Image src="/images/trust-bg.png" alt="" fill style={{ objectFit: 'cover', opacity: 0.15 }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className={styles.trustGrid}>
            <div className={styles.trustStat}>
              <Star size={22} />
              <div>
                <strong>4.8/5</strong>
                <span>Rating trung bình</span>
              </div>
            </div>
            <div className={styles.trustStat}>
              <Users size={22} />
              <div>
                <strong>10,000+</strong>
                <span>Khách hàng tin dùng</span>
              </div>
            </div>
            <div className={styles.trustStat}>
              <Leaf size={22} />
              <div>
                <strong>100%</strong>
                <span>Thành phần thuần chay</span>
              </div>
            </div>
            <div className={styles.trustStat}>
              <Award size={22} />
              <div>
                <strong>Chứng nhận</strong>
                <span>Bác sĩ da liễu xác nhận</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Categories Section */}
        <section className={styles.section}>
          <FadeIn direction="up">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Danh Mục Sản Phẩm</h2>
                <p className={styles.sectionSubtitle}>Dành riêng cho từng nhu cầu của làn da</p>
              </div>
              <Link href="/products" className={styles.btnSecondary}>
                Xem tất cả danh mục
              </Link>
            </div>
          </FadeIn>

          <StaggerContainer className={styles.categoriesGrid}>
            {FEATURED_CATEGORIES.map((cat) => (
              <StaggerItem 
                key={cat.slug} 
                className={
                  cat.size === 'large' ? styles.categoryCardLarge : 
                  cat.size === 'medium' ? styles.categoryCardMedium : 
                  styles.categoryCardSmall
                }
              >
                <Link href={`/products?category=${cat.slug}`} className={styles.categoryCard}>
                  <div className={styles.categoryImageWrap}>
                    <Image 
                      src={cat.image} 
                      alt={cat.name} 
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className={styles.categoryImage}
                    />
                  </div>
                  <div className={styles.categoryOverlay}>
                    <span className={styles.categoryTag}>Premium Care</span>
                    <h3 className={styles.categoryName}>{cat.name}</h3>
                    <p className={styles.categoryDesc}>{cat.description}</p>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* Best Sellers Products */}
        <section className={styles.section}>
          <FadeIn direction="up">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Sản Phẩm Bán Chạy</h2>
                <p className={styles.sectionSubtitle}>Những sản phẩm được yêu thích nhất trong 30 ngày qua</p>
              </div>
              <div className={styles.heroBadge} style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-dark)' }}>
                <TrendingUp size={16} /> Top Xu Hướng
              </div>
            </div>
          </FadeIn>
          
          <FadeIn direction="up" delay={0.2}>
            <BestSellers products={bestSellers || []} />
          </FadeIn>
        </section>
      </div>

      {/* Why Choose Us */}
      <section className={styles.whySection}>
        <div className="container">
          <div className={styles.whyLayout}>
            <FadeIn direction="left" className={styles.whyImageWrap}>
              <Image 
                src="/images/why-liquid.png" 
                alt="VeganGlow Botanical Liquid" 
                width={800} 
                height={800} 
                className={styles.whyLiquidImage}
              />
            </FadeIn>

            <div className={styles.whyContent}>
              <FadeIn direction="right">
                <div style={{ textAlign: 'left', marginBottom: 'var(--space-4)' }}>
                  <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Tại Sao Chọn VeganGlow?</h2>
                  <p className={styles.sectionSubtitle} style={{ textAlign: 'left', margin: '0' }}>Cam kết từ thiên nhiên, trao gửi đến bạn</p>
                </div>
              </FadeIn>

              <StaggerContainer className={styles.whyGrid}>
                <StaggerItem className={styles.whyCard}>
                  <span className={styles.whyIcon}>
                    <Leaf size={24} />
                  </span>
                  <h3>100% Thuần Chay</h3>
                  <p>Không sử dụng thành phần từ động vật và không thử nghiệm trên động vật.</p>
                </StaggerItem>

                <StaggerItem className={styles.whyCard}>
                  <span className={styles.whyIcon}>
                    <Shield size={24} />
                  </span>
                  <h3>Chuẩn Y Khoa</h3>
                  <p>Được nghiên cứu và kiểm nghiệm da liễu, an toàn cho da nhạy cảm nhất.</p>
                </StaggerItem>

                <StaggerItem className={styles.whyCard}>
                  <span className={styles.whyIcon}>
                    <Heart size={24} />
                  </span>
                  <h3>Nguyên Liệu VN</h3>
                  <p>Chắt lọc tinh túy từ rau má, diếp cá, hoa đậu biếc và thảo mộc địa phương.</p>
                </StaggerItem>

                <StaggerItem className={styles.whyCard}>
                  <span className={styles.whyIcon}>
                    <Recycle size={24} />
                  </span>
                  <h3>Bảo Vệ Môi Trường</h3>
                  <p>Bao bì tái chế 100%, không nhựa dùng một lần, cam kết trung hòa carbon.</p>
                </StaggerItem>
              </StaggerContainer>
              
              <FadeIn direction="up" delay={0.4}>
                <div style={{ marginTop: 'var(--space-4)' }}>
                   <Link href="/about" className={styles.btnPrimary}>
                     Khám phá sứ mệnh <ArrowRight size={18} />
                   </Link>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className={styles.testimonialsSection}>
          <div className="container">
            <FadeIn direction="up">
              <h2 className={styles.sectionTitle}>Khách Hàng Nói Gì?</h2>
              <p className={styles.sectionSubtitle}>
                Hàng nghìn khách hàng đã tin tưởng và yêu thích VeganGlow
              </p>
              <StaggerContainer className={styles.testimonialsGrid}>
                {testimonials.map((t) => (
                  <StaggerItem key={t.id} className={styles.testimonialCard}>
                    <Quote size={28} className={styles.testimonialQuote} />
                    <p className={styles.testimonialText}>{t.text}</p>
                    <div className={styles.testimonialStars}>
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} size={14} fill="currentColor" />
                      ))}
                    </div>
                    <div className={styles.testimonialAuthor}>
                      <div className={styles.testimonialAvatar}>{t.avatar_initials}</div>
                      <div className={styles.testimonialMeta}>
                        <strong>{t.name}</strong>
                        <span>{t.role}</span>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </FadeIn>
          </div>
        </section>
      )}

      {/* Brand Story Section */}
      <section className={styles.storySection}>
        <div className="container">
          <FadeIn direction="up">
            <div className={styles.storyLayout}>
              <div className={styles.storyContent}>
                <span className={styles.storyTag}>Câu chuyện của chúng tôi</span>
                <h2 className={styles.storyTitle}>
                  Từ Tình Yêu Thiên Nhiên <br />
                  Đến <span className={styles.heroAccent}>VeganGlow</span>
                </h2>
                <p className={styles.storyText}>
                  VeganGlow được thành lập với một sứ mệnh đơn giản: mang vẻ đẹp thuần khiết từ
                  thiên nhiên Việt Nam đến mọi gia đình. Chúng tôi tin rằng bạn không cần phải hy
                  sinh sức khỏe hay môi trường để có làn da đẹp.
                </p>
                <p className={styles.storyText}>
                  Mỗi sản phẩm được nghiên cứu kỹ lưỡng, sử dụng những thảo mộc quý từ rừng núi
                  Việt Nam — rau má, diếp cá, hoa đậu biếc — kết hợp với công nghệ hiện đại để tạo
                  ra công thức hoàn hảo nhất.
                </p>
                <div className={styles.storyCta}>
                  <Link href="/about" className={styles.btnPrimary}>
                    Tìm hiểu thêm <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
              <div className={styles.storyImageWrap}>
                 <Image
                   src="/images/story-liquid.png"
                   alt="VeganGlow Botanical Skincare Essence"
                   width={600}
                   height={600}
                   className={styles.storyImage}
                   loading="lazy"
                 />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCtaSection} style={{ position: 'relative', overflow: 'hidden' }}>
        <Image src="/images/why-editorial.png" alt="VeganGlow Skincare" fill style={{ objectFit: 'cover', zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(12, 38, 26, 0.8), rgba(12, 38, 26, 0.4))', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <FadeIn direction="up">
            <h2 className={styles.finalCtaTitle}>Bắt Đầu Hành Trình Làm Đẹp Của Bạn</h2>
            <p className={styles.finalCtaText}>
              Khám phá bộ sưu tập sản phẩm thuần chay, an toàn cho cả gia đình
            </p>
            <Link href="/products" className={styles.btnWhite}>
              Mua Sắm Ngay <ArrowRight size={18} />
            </Link>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
