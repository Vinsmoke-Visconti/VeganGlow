'use client';

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
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 80px' }}>
      {/* ═══════════ HEADER — luôn căn giữa ═══════════ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          textAlign: 'center',
          maxWidth: 600,
          margin: '0 auto 48px',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            marginBottom: 16,
          }}
          className="text-primary"
        >
          <Heart size={14} /> Bộ sưu tập riêng của bạn
        </span>

        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: '0 0 16px',
          }}
          className="font-serif text-text"
        >
          Danh sách yêu thích
        </h1>

        <p style={{ fontSize: 15, lineHeight: 1.7 }} className="text-text-secondary">
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
        <>
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
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
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
                   className="absolute top-4 right-4 grid place-items-center w-10 h-10 rounded-full bg-white/95 shadow-lg text-error opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:scale-110 active:scale-95 z-10"
                   title="Xóa khỏi danh sách"
                   aria-label="Xóa khỏi danh sách yêu thích"
                 >
                   <Trash2 size={18} />
                 </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </div>
  );
}

/* ═══════════ EMPTY BLOCK — inline style đảm bảo center 100% ═══════════ */

interface EmptyBlockProps {
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
}

function EmptyBlock({ title, description, actionLabel, actionHref, onAction }: EmptyBlockProps) {
  const btnClass =
    'inline-flex items-center justify-center h-12 px-8 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition';

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
        padding: '64px 16px 80px',
      }}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
        className="bg-primary/5 text-primary"
      >
        <Heart size={32} />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{
          fontSize: 'clamp(1.5rem, 3vw, 2rem)',
          fontWeight: 500,
          marginBottom: 12,
          textAlign: 'center',
        }}
        className="font-serif text-text"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{
          maxWidth: 420,
          margin: '0 auto 32px',
          fontSize: 14,
          lineHeight: 1.7,
          textAlign: 'center',
        }}
        className="text-text-secondary"
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
        <Link href={actionHref} className={btnClass}>
          {actionLabel}
          <ArrowRight size={16} style={{ marginLeft: 6 }} />
        </Link>
      ) : (
        <button type="button" onClick={onAction} className={btnClass}>
          {actionLabel}
          <ArrowRight size={16} style={{ marginLeft: 6 }} />
        </button>
        )}
      </motion.div>
    </motion.div>
  );
}
