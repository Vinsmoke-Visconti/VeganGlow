'use client';

import styles from './wishlist.module.css';
import ProductCard, { type ProductCardProduct } from '@/components/products/ProductCard';
import { createBrowserClient } from '@/lib/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Heart, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

  /* ── Loading ── */
  if (loading) {
    return (
      <div className={styles.page}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '2px solid #e8e5e0',
              display: 'grid',
              placeItems: 'center',
            }}
            className="animate-pulse"
          >
            <Heart size={20} className="text-text-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.emptyState}>
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={styles.header}
        >
          <span className={styles.eyebrow}>
            <Heart size={14} /> Bộ sưu tập riêng của bạn
          </span>

          <h1 className={styles.title}>
            Danh sách yêu thích
          </h1>

          <p className={styles.subtitle}>
            Lưu lại những sản phẩm bạn yêu quý để mua sau.
          </p>
        </motion.header>

        {/* ═══════════ CONTENT ═══════════ */}
        {authed === false ? (
          <EmptyBlock
            title="Bạn chưa đăng nhập"
            description="Đăng nhập để lưu danh sách yêu thích trên mọi thiết bị."
            actionLabel="Đăng nhập"
            onAction={() =>
              router.push(`/login?redirectTo=${encodeURIComponent('/wishlist')}`)
            }
          />
        ) : wishlist.length === 0 ? (
          <EmptyBlock
            title="Chưa có sản phẩm yêu thích"
            description="Hãy dạo quanh cửa hàng và nhấn vào biểu tượng trái tim để lưu lại những món đồ bạn ưng ý."
            actionLabel="Tiếp tục mua sắm"
            actionHref="/products"
          />
        ) : (
          <div style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
              }}
            >
              <span className="text-sm text-text-secondary">
                <span className="font-medium text-text">{wishlist.length}</span> sản phẩm
              </span>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={styles.grid}
            >
              <AnimatePresence mode="popLayout">
                {wishlist.map((product) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    key={product.id}
                    className="relative group"
                  >
                   <ProductCard product={product} hideWishlist />
                   <button
                     type="button"
                     onClick={() => removeFromWishlist(product.id)}
                     className={styles.removeWishlistBtn}
                     title="Xóa khỏi danh sách"
                     aria-label="Xóa khỏi danh sách yêu thích"
                   >
                     <Trash2 size={18} />
                   </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ EMPTY BLOCK ═══════════ */

interface EmptyBlockProps {
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
}

function EmptyBlock({ title, description, actionLabel, actionHref, onAction }: EmptyBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
        className={styles.emptyIcon}
      >
        <Heart size={32} />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className={styles.emptyTitle}
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className={styles.emptyText}
      >
        {description}
      </motion.p>

      {/* Action button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        {actionHref ? (
          <Link href={actionHref} className={styles.shopBtn}>
            {actionLabel}
            <ArrowRight size={16} style={{ marginLeft: 6 }} />
          </Link>
        ) : (
          <button type="button" onClick={onAction} className={styles.shopBtn}>
            {actionLabel}
            <ArrowRight size={16} style={{ marginLeft: 6 }} />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

