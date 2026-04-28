'use client';

import Link from 'next/link';
import { Star, ShoppingBag, Heart, Zap, Tag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import styles from './Product.module.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
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
  };
}

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);

  const formatVND = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const discountPercent = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const handleBuyNow = () => {
    addToCart(product as any);
    router.push('/checkout');
  };

  return (
    <div className={styles.premiumCard}>
      <div className={styles.imageWrap}>
        <Link href={`/products/${product.slug}`}>
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name} 
              className={styles.image}
              loading="lazy"
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
          onClick={(e) => {
            e.preventDefault();
            setIsLiked(!isLiked);
          }}
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
            className={styles.cartBtn}
            onClick={() => addToCart(product as any)}
          >
            <ShoppingBag size={18} />
          </button>
          <button 
            className={styles.buyBtn}
            onClick={handleBuyNow}
          >
            Mua ngay
          </button>
        </div>
      </div>
    </div>
  );
}
