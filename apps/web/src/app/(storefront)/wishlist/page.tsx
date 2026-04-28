'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import styles from './wishlist.module.css';
import ProductCard from '@/components/products/ProductCard';

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage for now as it's a UI-focused task
    const saved = localStorage.getItem('wishlist');
    if (saved) {
      try {
        setWishlist(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse wishlist', e);
      }
    }
    setLoading(false);
  }, []);

  const removeFromWishlist = (productId: string) => {
    const updated = wishlist.filter(item => item.id !== productId);
    setWishlist(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
  };

  if (loading) return null;

  return (
    <div className={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.header}
      >
        <h1 className={styles.title}>Danh sách yêu thích</h1>
        <p className={styles.subtitle}>Lưu lại những sản phẩm bạn yêu quý để mua sau</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {wishlist.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={styles.emptyState}
          >
            <div className={styles.emptyIcon}>
              <Heart size={48} fill="currentColor" style={{ opacity: 0.2 }} />
            </div>
            <h3 className={styles.emptyTitle}>Chưa có sản phẩm yêu thích</h3>
            <p className={styles.emptyText}>
              Hãy dạo quanh cửa hàng và nhấn vào biểu tượng trái tim để lưu lại những món đồ bạn ưng ý nhé.
            </p>
            <Link href="/products" className={styles.shopBtn}>
              Tiếp tục mua sắm <ArrowRight size={18} style={{ marginLeft: 8 }} />
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.grid}
          >
            {wishlist.map((product) => (
              <div key={product.id} style={{ position: 'relative' }}>
                <ProductCard product={product} />
                <button 
                  onClick={() => removeFromWishlist(product.id)}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'white',
                    color: '#ef4444',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 10,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  title="Xóa khỏi danh sách"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
