'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Check, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { normalizeProductImage } from '@/lib/imageUrl';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

export interface ProductCardProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  short_description?: string | null;
  has_variants?: boolean;
  default_compare_at_price?: number | null;
  // Legacy fields kept for back-compat with callers; no longer rendered.
  original_price?: number;
  description?: string;
  rating?: number;
  reviews_count?: number;
  is_active?: boolean;
  categories?: {
    name: string;
    slug: string;
  } | null;
}

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

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
      await new Promise((r) => setTimeout(r, Math.random() * 300));
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

  const compareAt = product.default_compare_at_price ?? product.original_price ?? null;
  const discountPercent =
    compareAt && compareAt > product.price
      ? Math.round(((compareAt - product.price) / compareAt) * 100)
      : 0;

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
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

    const { error } = nextLiked
      ? await (
          supabase.from('favorites') as unknown as {
            upsert: (row: { user_id: string; product_id: string }) => Promise<{ error: { message: string } | null }>;
          }
        ).upsert({
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
    <article className="group relative flex flex-col bg-bg-card rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square bg-primary-50 overflow-hidden"
        aria-label={product.name}
      >
        {productImage ? (
          <Image
            src={productImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            unoptimized
          />
        ) : (
          <div className="grid place-items-center h-full font-serif text-5xl text-primary">
            {product.name.charAt(0)}
          </div>
        )}

        {discountPercent > 0 && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-text text-white text-[11px] font-medium tracking-wide">
            −{discountPercent}%
          </span>
        )}

        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={favoritePending}
          className="absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full bg-white/85 backdrop-blur transition hover:bg-white"
          aria-label={isLiked ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
        >
          <Heart
            size={16}
            fill={isLiked ? '#ef4444' : 'none'}
            color={isLiked ? '#ef4444' : 'currentColor'}
          />
        </button>
      </Link>

      <div className="flex flex-col gap-1.5 p-4">
        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
          {product.categories?.name || 'Mỹ phẩm'}
        </span>

        <Link
          href={`/products/${product.slug}`}
          className="font-serif text-base leading-snug text-text line-clamp-2 hover:text-primary transition"
        >
          {product.name}
        </Link>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-serif text-lg font-semibold text-text">{formatVND(product.price)}</span>
          {discountPercent > 0 && compareAt && (
            <span className="text-sm text-text-muted line-through">{formatVND(compareAt)}</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className="mt-3 w-full h-10 rounded-full bg-text text-white text-sm font-medium tracking-tight inline-flex items-center justify-center gap-2 hover:bg-primary-dark transition"
          aria-label={justAdded ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ'}
        >
          {justAdded ? (
            <>
              <Check size={16} /> Đã thêm
            </>
          ) : (
            <>
              <ShoppingBag size={16} /> Thêm vào giỏ
            </>
          )}
        </button>
      </div>
    </article>
  );
}
