import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/styles/Home.module.css";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .limit(4);
        
        if (error) throw error;
        setFeaturedProducts(data || []);
      } catch (err) {
        console.error("Error fetching featured products:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  return (
    <>
      <Head>
        <title>VeganGlow | Mỹ phẩm tuần chay & tự nhiên</title>
        <meta name="description" content="Chăm sóc da tự nhiên với mỹ phẩm thuần chay VeganGlow" />
      </Head>

      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Vẻ đẹp rạng rỡ từ Thiên nhiên</h1>
          <p>
            Trải nghiệm dòng mỹ phẩm thuần chay cao cấp, chiết xuất hoàn toàn từ thảo mộc quý, 
            mang lại hiệu quả phục hồi sâu cho làn da bạn.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/products" className="btn btn-primary">Mua ngay</Link>
            <Link href="/about" className="btn" style={{ border: '1px solid var(--border)' }}>Tìm hiểu thêm</Link>
          </div>
        </div>
        
        <div className={styles.heroImage}>
          <Image 
            src="/images/hero.png" 
            alt="Vegan Skincare" 
            fill 
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 style={{ color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Phổ biến</h4>
            <h2>Sản phẩm nổi bật</h2>
          </div>
          <Link href="/products" style={{ color: 'var(--muted)', fontWeight: '600' }}>Xem tất cả &rarr;</Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Đang tải sản phẩm...</div>
        ) : (
          <div className={styles.productGrid}>
            {featuredProducts.map((product) => (
              <div key={product.id} className="card" style={{ padding: '1rem', transition: 'transform 0.2s', cursor: 'pointer' }}>
                <Link href={`/products/${product.id}`}>
                  <div style={{ position: 'relative', height: '260px', marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', background: '#f9f9f9' }}>
                    {product.image_url ? (
                      <Image src={product.image_url} alt={product.name} fill style={{ objectFit: 'cover' }} />
                    ) : (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#ccc' }}>
                        {product.name} Image
                      </div>
                    )}
                  </div>
                </Link>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{product.name}</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{product.category}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '1.125rem' }}>{Number(product.price).toLocaleString('vi-VN')}đ</span>
                    <button className="btn btn-primary" style={{ padding: '0.5rem' }}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
