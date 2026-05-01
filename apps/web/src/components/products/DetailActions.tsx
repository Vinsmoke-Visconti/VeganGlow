'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { setBuyNow } from '@/lib/buyNow';
import { useRouter } from 'next/navigation';
import { Check, ShoppingCart } from 'lucide-react';
import VariantSelector, { type Variant } from './VariantSelector';
import QuantityStepper from './QuantityStepper';
import MobileBuyBar from './MobileBuyBar';

interface BaseProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  image?: string | null;
  stock: number;
}

interface DetailActionsProps {
  product: BaseProduct;
  variants: Variant[];
  hasVariants: boolean;
}

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export default function DetailActions({ product, variants, hasVariants }: DetailActionsProps) {
  const { addToCart, updateQuantity } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const showVariantSelector = hasVariants && variants.length > 0;
  const effectivePrice = selectedVariant?.price ?? product.price;
  const compareAt = selectedVariant?.compare_at_price ?? null;
  const effectiveStock = showVariantSelector ? (selectedVariant?.stock ?? 0) : product.stock;
  const effectiveImage = selectedVariant?.image_url ?? product.image ?? null;
  const itemId = selectedVariant?.id ?? product.id;
  const itemName = selectedVariant?.name ? `${product.name} — ${selectedVariant.name}` : product.name;
  const variantBlocked = showVariantSelector && !selectedVariant;
  const outOfStock = effectiveStock <= 0;
  const cantBuy = variantBlocked || outOfStock;

  const discountPercent =
    compareAt && compareAt > effectivePrice
      ? Math.round(((compareAt - effectivePrice) / compareAt) * 100)
      : 0;

  const handleAddToCart = () => {
    if (cantBuy) return;
    addToCart({
      id: itemId,
      slug: product.slug,
      name: itemName,
      price: effectivePrice,
      image: effectiveImage,
    });
    if (quantity > 1) updateQuantity(itemId, quantity);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  const handleBuyNow = () => {
    if (cantBuy) return;
    setBuyNow({
      id: itemId,
      slug: product.slug,
      name: itemName,
      price: effectivePrice,
      image: effectiveImage ?? undefined,
      quantity,
    });
    router.push('/checkout?buyNow=1');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Price row */}
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-serif text-3xl lg:text-4xl font-semibold text-text">
          {formatVND(effectivePrice)}
        </span>
        {compareAt && compareAt > effectivePrice && (
          <>
            <span className="text-lg text-text-muted line-through">{formatVND(compareAt)}</span>
            <span className="px-2 py-0.5 rounded-full bg-text text-white text-xs font-medium">
              −{discountPercent}%
            </span>
          </>
        )}
      </div>

      {/* Stock chip */}
      <div className="text-sm">
        {outOfStock ? (
          <span className="text-error">Hết hàng</span>
        ) : effectiveStock <= 5 ? (
          <span className="text-secondary">Sắp hết — chỉ còn {effectiveStock}</span>
        ) : (
          <span className="text-text-secondary">Còn hàng</span>
        )}
      </div>

      {/* Variant selector */}
      {showVariantSelector && (
        <VariantSelector variants={variants} onVariantChange={setSelectedVariant} />
      )}

      {/* Quantity */}
      <div className="flex items-center gap-4">
        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">Số lượng</span>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={effectiveStock > 0 ? effectiveStock : undefined}
        />
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={cantBuy}
          className="w-full h-12 rounded-full bg-text text-white font-medium tracking-tight inline-flex items-center justify-center gap-2 hover:bg-primary-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {justAdded ? (
            <>
              <Check size={18} /> Đã thêm vào giỏ
            </>
          ) : (
            <>
              <ShoppingCart size={18} /> Thêm vào giỏ
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={cantBuy}
          className="w-full h-12 rounded-full border border-text text-text font-medium tracking-tight hover:bg-text hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Mua ngay
        </button>
        {variantBlocked && (
          <p className="text-xs text-text-muted">Vui lòng chọn đầy đủ tùy chọn để tiếp tục.</p>
        )}
      </div>

      <MobileBuyBar
        price={effectivePrice}
        disabled={cantBuy}
        onAddToCart={handleAddToCart}
        justAdded={justAdded}
      />
    </div>
  );
}
