import { createClient } from '@/lib/supabase/server';
import type { ProductWithCategory } from '@/types/product';
import styles from './page.module.css';

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch featured products (top rated)
  const { data: featuredProducts } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('is_active', true)
    .order('rating', { ascending: false })
    .limit(6);

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>🌿 100% Thuần chay</span>
          <h1 className={styles.heroTitle}>
            Vẻ đẹp thuần khiết
            <br />
            <span className={styles.heroAccent}>từ thiên nhiên Việt</span>
          </h1>
          <p className={styles.heroDescription}>
            Khám phá bộ sưu tập mỹ phẩm thuần chay được chiết xuất từ những
            nguyên liệu thiên nhiên quý giá của Việt Nam.
          </p>
          <div className={styles.heroActions}>
            <a href="/products" className={styles.btnPrimary}>
              Khám phá ngay
            </a>
            <a href="/about" className={styles.btnSecondary}>
              Tìm hiểu thêm
            </a>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className={styles.section}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Danh mục sản phẩm</h2>
          <div className={styles.categoriesGrid}>
            {categories?.map((cat) => (
              <a
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className={styles.categoryCard}
              >
                <span className={styles.categoryIcon}>🌱</span>
                <span className={styles.categoryName}>{cat.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className={styles.section}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Sản phẩm nổi bật</h2>
          <p className={styles.sectionSubtitle}>
            Được yêu thích nhất bởi cộng đồng VeganGlow
          </p>
          <div className={styles.productsGrid}>
            {(featuredProducts as ProductWithCategory[])?.map((product) => (
              <a
                key={product.id}
                href={`/products/${product.slug}`}
                className={styles.productCard}
              >
                <div className={styles.productImageWrap}>
                  <img
                    src={product.image}
                    alt={product.name}
                    className={styles.productImage}
                    loading="lazy"
                  />
                  {product.rating >= 4.8 && (
                    <span className={styles.productBadge}>Bestseller</span>
                  )}
                </div>
                <div className={styles.productInfo}>
                  <span className={styles.productCategory}>
                    {product.categories?.name}
                  </span>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productMeta}>
                    <span className={styles.productRating}>
                      ⭐ {product.rating}
                    </span>
                    <span className={styles.productReviews}>
                      ({product.reviews_count} đánh giá)
                    </span>
                  </div>
                  <span className={styles.productPrice}>
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(product.price)}
                  </span>
                </div>
              </a>
            ))}
          </div>
          <div className={styles.viewAll}>
            <a href="/products" className={styles.btnPrimary}>
              Xem tất cả sản phẩm →
            </a>
          </div>
        </div>
      </section>

      {/* Why VeganGlow Section */}
      <section className={styles.whySection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Tại sao chọn VeganGlow?</h2>
          <div className={styles.whyGrid}>
            <div className={styles.whyCard}>
              <span className={styles.whyIcon}>🌿</span>
              <h3>100% Thuần chay</h3>
              <p>Không thử nghiệm trên động vật, không chất gây hại</p>
            </div>
            <div className={styles.whyCard}>
              <span className={styles.whyIcon}>🇻🇳</span>
              <h3>Nguyên liệu Việt</h3>
              <p>Chiết xuất từ rau má, nghệ, trà xanh Shan Tuyết</p>
            </div>
            <div className={styles.whyCard}>
              <span className={styles.whyIcon}>🔬</span>
              <h3>Khoa học hiện đại</h3>
              <p>Công thức được nghiên cứu bởi chuyên gia da liễu</p>
            </div>
            <div className={styles.whyCard}>
              <span className={styles.whyIcon}>♻️</span>
              <h3>Bao bì tái chế</h3>
              <p>Cam kết bảo vệ môi trường với bao bì thân thiện</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
