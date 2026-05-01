'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './wishlist.module.css';
import ProductCard, { type ProductCardProduct } from '@/components/products/ProductCard';
import { createBrowserClient } from '@/lib/supabase/client';

type FavoriteRow = {
  product_id: string;
  products: ProductCardProduct | null;
};

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<ProductCardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = createBrowserClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (!user) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      setAuthed(true);

      const { data, error } = await supabase
        .from('favorites')
        .select('product_id, products(*)')
        .eq('user_id', user.id);

      if (!alive) return;

      if (!error && data) {
        const products = (data as unknown as FavoriteRow[])
          .map((r) => r.products)
          .filter((p): p is ProductCardProduct => Boolean(p));
        setWishlist(products);
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const removeFromWishlist = async (productId: string) => {
    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const prev = wishlist;
    setWishlist((items) => items.filter((p) => p.id !== productId));

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) setWishlist(prev);
  };

  if (loading) return null;

  if (authed === false) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Danh sách yêu thích</h1>
          <p className={styles.subtitle}>Đăng nhập để xem các sản phẩm bạn đã lưu</p>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Heart size={48} fill="currentColor" style={{ opacity: 0.2 }} />
          </div>
          <h3 className={styles.emptyTitle}>Bạn chưa đăng nhập</h3>
          <p className={styles.emptyText}>
            Đăng nhập để lưu danh sách yêu thích trên mọi thiết bị.
          </p>
          <button
            type="button"
            onClick={() =>
              router.push(`/login?redirectTo=${encodeURIComponent('/wishlist')}`)
            }
            className={styles.shopBtn}
          >
            Đăng nhập <ArrowRight size={18} style={{ marginLeft: 8 }} />
          </button>
        </div>
      </div>
    );
  }

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
                  className={styles.removeWishlistBtn}
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
