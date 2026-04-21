import { useEffect, useState } from 'react';
import Head from 'next/head';
import ProductCard from '@/components/products/ProductCard';
import { supabase } from '@/lib/supabase';
import styles from '@/styles/Home.module.css';

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...new Set(products.map(p => p.category))];

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('id', { ascending: true });
        
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Head>
        <title>Sản phẩm | VeganGlow</title>
      </Head>

      <div className={styles.section}>
        <header style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Tất cả sản phẩm</h1>
          <p style={{ color: 'var(--muted)' }}>Khám phá dòng mỹ phẩm thuần chay tự nhiên của chúng tôi</p>
        </header>

        <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <input 
              type="text" 
              placeholder="Tìm kiếm sản phẩm..." 
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="btn"
                style={{ 
                  background: selectedCategory === cat ? 'var(--primary)' : 'var(--white)',
                  color: selectedCategory === cat ? 'white' : 'var(--foreground)',
                  border: '1px solid var(--border)',
                  fontSize: '0.875rem'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>Đang tải danh sách sản phẩm...</div>
        ) : filteredProducts.length > 0 ? (
          <div className={styles.productGrid}>
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
            Không tìm thấy sản phẩm nào phù hợp.
          </div>
        )}
      </div>
    </>
  );
}
