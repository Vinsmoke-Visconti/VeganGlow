import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from '@/styles/Home.module.css';
import { useCart } from '@/context/CartContext';

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    async function fetchProduct() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        setProduct(data);
      } catch (err) {
        console.error('Error fetching product:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  if (loading) {
    return <div className={styles.section}>Đang tải thông tin sản phẩm...</div>;
  }

  if (!product) {
    return (
      <div className={styles.section} style={{ textAlign: 'center' }}>
        <h2>Không tìm thấy sản phẩm</h2>
        <Link href="/products" className="btn btn-primary" style={{ marginTop: '1rem' }}>Quay lại cửa hàng</Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{product.name} | VeganGlow</title>
      </Head>

      <div className={styles.section}>
        <Link href="/products" style={{ display: 'inline-block', marginBottom: '2rem', color: 'var(--muted)' }}>
          &larr; Quay lại danh sách
        </Link>
        
        <div style={{ display: 'flex', gap: '4rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px', background: '#f9f9f9', borderRadius: '24px', overflow: 'hidden', height: '500px', position: 'relative' }}>
            {product.image_url ? (
              <Image 
                src={product.image_url} 
                alt={product.name} 
                fill 
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                No image available
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: '300px', padding: '1rem 0' }}>
            <span style={{ color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.875rem' }}>
              {product.category}
            </span>
            <h1 style={{ fontSize: '3rem', margin: '1rem 0', lineHeight: '1.2' }}>{product.name}</h1>
            <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--foreground)', marginBottom: '2rem' }}>
              {Number(product.price).toLocaleString('vi-VN')}đ
            </p>
            
            <div style={{ marginBottom: '2.5rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>Thành phần chính</h4>
              <p style={{ color: 'var(--muted)', lineHeight: '1.7' }}>{product.ingredients}</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}
                onClick={() => addToCart(product)}
              >
                Thêm vào giỏ hàng
              </button>
              <button className="btn" style={{ border: '1px solid var(--border)', padding: '1rem' }}>
                &hearts;
              </button>
            </div>

            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                🚀 <b>Giao hàng miễn phí</b> cho đơn hàng trên 500k<br/>
                🌿 <b>Cam kết:</b> 100% thuần chay, không thử nghiệm trên động vật
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
