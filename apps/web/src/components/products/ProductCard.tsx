'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, ShoppingBag, Heart, Tag, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { setBuyNow } from '@/lib/buyNow';
import { normalizeProductImage } from '@/lib/imageUrl';
import styles from './Product.module.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

export interface ProductCardProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number;
  image?: string;
  description?: string;
  rating?: number;
  reviews_count?: number;
  is_active?: boolean;
  categories?: {
    name: string;
    slug: string;
  } | null;
}

export default function ProductCard({ product }: { product: ProductCardProduct }) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const supabase = createBrowserClient();
  const productImage = normalizeProductImage(product.image);

  useEffect(() => {
    let alive = true;

    async function loadFavoriteState() {
      // Jitter to prevent auth lock contention on page load with many cards
      await new Promise(r => setTimeout(r, Math.random() * 300));
      if (!alive) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;
      if (!alive || !user) return;

      const { data } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (alive) setIsLiked(Boolean(data));
    }

    void loadFavoriteState();
    return () => {
      alive = false;
    };
  }, [product.id, supabase]);

  const formatVND = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const discountPercent = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const handleAddToCart = () => {
    addToCart(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  };

  const handleBuyNow = () => {
    setBuyNow({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
    router.push('/checkout?buyNow=1');
  };

  const handleWishlistToggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (favoritePending) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/products/${product.slug}`)}`);
      return;
    }

    setFavoritePending(true);
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);

    // Supabase generated types (PostgrestVersion 14.5) narrow Insert payloads
    // to `never`; cast the table to bypass the type bug. Runtime behaviour is
    // unaffected and the schema is enforced server-side via the favorites table.
    const { error } = nextLiked
      ? await (supabase.from('favorites') as unknown as {
          upsert: (row: { user_id: string; product_id: string }) => Promise<{ error: { message: string } | null }>;
        }).upsert({
          user_id: user.id,
          product_id: product.id,
        })
      : await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);

    if (error) setIsLiked(!nextLiked);
    setFavoritePending(false);
  };

  return (
    <div className={styles.premiumCard}>
      <div className={styles.imageWrap}>
        <Link href={`/products/${product.slug}`}>
          {productImage ? (
            <Image
              src={productImage}
              alt={product.name}
              width={400}
              height={400}
              className={styles.image}
              priority={product.id === 'lcp-1' || product.id === 'lcp-2'} 
              unoptimized
            />
          ) : (
            <div className={styles.placeholder}>{product.name.charAt(0)}</div>
          )}
        </Link>

        {/* Badges */}
        <div className={styles.badgeContainer}>
          {discountPercent > 0 && (
            <span className={`${styles.badge} ${styles.badgeSale}`}>
              -{discountPercent}%
            </span>
          )}
          {product.rating && product.rating >= 4.7 && (
            <span className={styles.badge}>Yêu thích</span>
          )}
          {discountPercent >= 20 && (
            <span className={`${styles.badge} ${styles.badgeCoupon}`}>
              <Tag size={10} style={{marginRight: 4}} /> Có mã giảm giá
            </span>
          )}
        </div>

        {/* Wishlist Action */}
        <button 
          className={styles.wishlistBtn}
          onClick={handleWishlistToggle}
          disabled={favoritePending}
          aria-label={isLiked ? 'Xóa khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
        >
          <Heart 
            size={18} 
            fill={isLiked ? "#ef4444" : "none"} 
            color={isLiked ? "#ef4444" : "currentColor"} 
          />
        </button>
      </div>

      <div className={styles.info}>
        <span className={styles.category}>{product.categories?.name || 'Mỹ phẩm'}</span>
        
        <Link href={`/products/${product.slug}`}>
          <h3 className={styles.name}>{product.name}</h3>
        </Link>
        
        <p className={styles.description}>
          {product.description || 'Sản phẩm thuần chay từ thảo dược thiên nhiên Việt Nam.'}
        </p>
        
        <div className={styles.ratingRow}>
          <div className={styles.stars}>
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={14} 
                fill={i < Math.floor(product.rating || 5) ? "currentColor" : "none"} 
              />
            ))}
          </div>
          <span className={styles.ratingValue}>{product.rating?.toFixed(1) || '5.0'}</span>
          <span className={styles.reviewsCount}>({product.reviews_count || 0} đánh giá)</span>
        </div>

        <div className={styles.priceContainer}>
          <span className={styles.price}>{formatVND(product.price || 0)}</span>
          {discountPercent > 0 && product.original_price && (
            <span className={styles.oldPrice}>{formatVND(product.original_price)}</span>
          )}
        </div>

        <div className={styles.buttonGroup}>
          <button
            className={`${styles.cartBtn} ${justAdded ? styles.cartBtnActive : ''}`}
            onClick={handleAddToCart}
            aria-label={justAdded ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ hàng'}
          >
            {justAdded ? <Check size={18} /> : <ShoppingBag size={18} />}
          </button>
          <button
            className={styles.buyBtn}
            onClick={handleBuyNow}
          >
            Mua ngay
          </button>
        </div>

        <Link href="/cart" className={styles.viewCartLink}>
          <ShoppingBag size={14} /> Xem giỏ hàng
        </Link>
      </div>
    </div>
  );
}
