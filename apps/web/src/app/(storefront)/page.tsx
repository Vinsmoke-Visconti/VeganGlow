import styles from './page.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import { ArrowRight, Leaf, Shield, Heart, Sparkles, Star, Users, Award, Recycle, Quote } from 'lucide-react';
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

const FALLBACK_TESTIMONIALS: TestimonialRow[] = [
  { id: 'fallback-1', name: 'Nguyễn Thị Lan', role: 'Khách hàng thân thiết', rating: 5,
    text: 'Sau 3 tuần dùng VeganGlow Serum, da mình sáng hẳn lên! Không còn lo ngại về thành phần hóa học nữa.',
    avatar_initials: 'NL' },
  { id: 'fallback-2', name: 'Trần Minh Châu', role: 'Beauty Blogger', rating: 5,
    text: 'Đây là thương hiệu thuần chay Việt Nam mình tự hào giới thiệu. Chất lượng sánh ngang hàng quốc tế.',
    avatar_initials: 'MC' },
  { id: 'fallback-3', name: 'Lê Thị Hoa', role: 'Da nhạy cảm', rating: 5,
    text: 'Da mình cực kỳ nhạy cảm nhưng sản phẩm VeganGlow không gây kích ứng gì. Thực sự yên tâm khi dùng.',
    avatar_initials: 'LH' },
];

export default async function Home() {
  const supabase = await createClient();

  const cacheKey = 'featured_products';
  let products = await cacheGet<ProductCardProduct[]>(cacheKey);

  if (!products) {
    const { data: dbProducts } = await supabase.from('products').select('*, categories(name, slug)').limit(4);
    products = (dbProducts ?? []) as unknown as ProductCardProduct[];
    await cacheSet(cacheKey, products, 1800);
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
      : FALLBACK_TESTIMONIALS;

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
                Nuôi Dưỡng Làn Da <br />
                Từ <span className={styles.heroAccent}>Thiên Nhiên</span>
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
      <section className={styles.trustBar}>
        <div className="container">
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
        <FadeIn direction="up">
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Danh Mục Sản Phẩm</h2>
                <p className={styles.sectionSubtitle}>Dành riêng cho từng nhu cầu của làn da</p>
              </div>
              <Link href="/products" className={styles.btnSecondary}>
                Xem tất cả danh mục
              </Link>
            </div>

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
        </FadeIn>

        {/* Featured Products */}
        <FadeIn direction="up">
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Sản Phẩm Nổi Bật</h2>
            <p className={styles.sectionSubtitle}>Những sản phẩm được yêu thích nhất</p>
            <StaggerContainer className={styles.productsGrid}>
              {products && products.length > 0 ? (
                products.map((p) => (
                  <StaggerItem key={p.id}>
                    <ProductCard product={p} />
                  </StaggerItem>
                ))
              ) : (
                <p>Chưa có sản phẩm.</p>
              )}
            </StaggerContainer>
            <div className={styles.viewAll}>
              <Link href="/products" className={styles.btnSecondary}>
                Xem tất cả sản phẩm
              </Link>
            </div>
          </section>
        </FadeIn>
      </div>

      {/* Why Choose Us */}
      <section className={styles.whySection}>
        <div className="container">
          <FadeIn direction="up">
            <h2 className={styles.sectionTitle}>Tại Sao Chọn VeganGlow?</h2>
            <p className={styles.sectionSubtitle}>Cam kết từ thiên nhiên, trao gửi đến bạn</p>
            <StaggerContainer className={styles.whyGrid}>
              <StaggerItem className={styles.whyCard}>
                <span className={styles.whyIcon}>
                  <Leaf size={32} color="#10b981" />
                </span>
                <h3>100% Thuần Chay</h3>
                <p>
                  Cam kết không sử dụng thành phần từ động vật và không thử nghiệm trên động vật.
                </p>
              </StaggerItem>
              <StaggerItem className={styles.whyCard}>
                <span className={styles.whyIcon}>
                  <Shield size={32} color="#10b981" />
                </span>
                <h3>Chuẩn Y Khoa</h3>
                <p>
                  Được nghiên cứu và kiểm nghiệm da liễu, an toàn cho cả làn da nhạy cảm nhất.
                </p>
              </StaggerItem>
              <StaggerItem className={styles.whyCard}>
                <span className={styles.whyIcon}>
                  <Heart size={32} color="#10b981" />
                </span>
                <h3>Nguyên Liệu Việt Nam</h3>
                <p>
                  Chắt lọc tinh túy từ rau má, diếp cá, hoa đậu biếc và các loại thảo mộc địa
                  phương.
                </p>
              </StaggerItem>
              <StaggerItem className={styles.whyCard}>
                <span className={styles.whyIcon}>
                  <Recycle size={32} color="#10b981" />
                </span>
                <h3>Thân Thiện Môi Trường</h3>
                <p>Bao bì tái chế 100%, không nhựa dùng một lần, cam kết trung hòa carbon.</p>
              </StaggerItem>
            </StaggerContainer>
          </FadeIn>
        </div>
      </section>

      {/* Testimonials Section */}
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
                  src="/images/hero.jpg"
                  alt="VeganGlow – Câu chuyện thương hiệu"
                  width={800}
                  height={800}
                  className={styles.storyImage}
                />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCtaSection}>
        <FadeIn direction="up">
          <h2 className={styles.finalCtaTitle}>Bắt Đầu Hành Trình Làm Đẹp Của Bạn</h2>
          <p className={styles.finalCtaText}>
            Khám phá bộ sưu tập sản phẩm thuần chay, an toàn cho cả gia đình
          </p>
          <Link href="/products" className={styles.btnWhite}>
            Mua Sắm Ngay <ArrowRight size={18} />
          </Link>
        </FadeIn>
      </section>
    </div>
  );
}
