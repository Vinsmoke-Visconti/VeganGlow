import styles from './page.module.css';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

export default async function Home() {
  const supabase = await createClient();
  const { data: products } = await supabase.from('products').select('*').limit(4);

  return (
    <div className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>✨ Khám phá Vẻ Đẹp Thuần Chay</div>
          <h1 className={styles.heroTitle}>
            Nuôi Dưỡng Làn Da <br/>
            Từ <span className={styles.heroAccent}>Thiên Nhiên</span>
          </h1>
          <p className={styles.heroDescription}>
            Sản phẩm mỹ phẩm 100% thuần chay, kết tinh từ những nguyên liệu tự nhiên tốt nhất của Việt Nam, mang lại vẻ đẹp bền vững và an toàn tuyệt đối.
          </p>
          <div className={styles.heroActions}>
            <Link href="/products" className={styles.btnPrimary}>Mua sắm ngay</Link>
            <Link href="/about" className={styles.btnSecondary}>Tìm hiểu thêm</Link>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Categories Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Danh Mục Sản Phẩm</h2>
          <p className={styles.sectionSubtitle}>Dành riêng cho từng nhu cầu của làn da</p>
          <div className={styles.categoriesGrid}>
            {['Serum', 'Toner', 'Mặt Nạ', 'Sữa Rửa Mặt', 'Kem Dưỡng'].map((cat, i) => (
              <div key={i} className={styles.categoryCard}>
                <div className={styles.categoryIcon}>🌿</div>
                <span className={styles.categoryName}>{cat}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Sản Phẩm Nổi Bật</h2>
          <p className={styles.sectionSubtitle}>Những sản phẩm được yêu thích nhất</p>
          <div className={styles.productsGrid}>
            {products && products.length > 0 ? (
              products.map((p: any) => (
                <div key={p.id} className={styles.productCard}>
                  <div className={styles.productImageWrap}>
                    <div className={styles.productBadge}>Best Seller</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={p.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=B7E4C7&color=1B4332&size=400`} 
                      alt={p.name} 
                      className={styles.productImage} 
                    />
                  </div>
                  <div className={styles.productInfo}>
                    <span className={styles.productCategory}>Skincare</span>
                    <h3 className={styles.productName}>{p.name}</h3>
                    <div className={styles.productMeta}>
                      <span className={styles.productRating}>★ {p.rating}</span>
                      <span className={styles.productReviews}>({p.review_count} đánh giá)</span>
                    </div>
                    <span className={styles.productPrice}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p>Chưa có sản phẩm.</p>
            )}
          </div>
          <div className={styles.viewAll}>
            <Link href="/products" className={styles.btnSecondary}>Xem tất cả sản phẩm</Link>
          </div>
        </section>
      </div>

      {/* Why Choose Us */}
      <section className={styles.whySection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Vì Sao Chọn VeganGlow?</h2>
          <div className={styles.whyGrid}>
            <div className={styles.whyCard}>
              <span className={styles.whyIcon}>🌱</span>
              <h3>100% Thuần Chay</h3>
              <p>Cam kết không sử dụng thành phần từ động vật và không thử nghiệm trên động vật.</p>
            </div>
            <div className={styles.whyCard}>
              <span className={styles.whyIcon}>🔬</span>
              <h3>Chuẩn Y Khoa</h3>
              <p>Được nghiên cứu và kiểm nghiệm da liễu, an toàn cho cả làn da nhạy cảm nhất.</p>
            </div>
            <div className={styles.whyCard}>
              <span className={styles.whyIcon}>🇻🇳</span>
              <h3>Nguyên Liệu Việt Nam</h3>
              <p>Chiết xuất từ những thảo mộc quý giá đặc hữu của vùng nhiệt đới Việt Nam.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
