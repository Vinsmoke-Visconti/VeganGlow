'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { setBuyNow } from '@/lib/buyNow';
import { ShoppingCart, Check, Sparkles } from 'lucide-react';
import VariantSelector, { type Variant } from './VariantSelector';
import QuantitySelector from './QuantitySelector';
import FreeshipBadge from './FreeshipBadge';
import styles from './ProductPurchasePanel.module.css';

type ProductInfo = {
  id: string;
  slug: string;
  name: string;
  price: number;
  old_price?: number | null;
  image?: string | null;
  stock: number;
};

type Props = {
  product: ProductInfo;
  variants: Variant[];
  freeshipThreshold: number;
};

function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export default function ProductPurchasePanel({ product, variants, freeshipThreshold }: Props) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const hasVariants = variants.length > 0;
  const effectivePrice = selectedVariant?.price ?? product.price;
  const effectiveOldPrice = selectedVariant?.compare_at_price ?? product.old_price ?? null;
  const effectiveStock = hasVariants
    ? selectedVariant?.stock ?? 0
    : product.stock;
  const effectiveImage = selectedVariant?.image_url ?? product.image ?? null;
  const variantBlocked = hasVariants && !selectedVariant;
  const outOfStock = effectiveStock <= 0;

  const discountPercent = effectiveOldPrice && effectiveOldPrice > effectivePrice
    ? Math.round(((effectiveOldPrice - effectivePrice) / effectiveOldPrice) * 100)
    : 0;

  const variantDescriptor = selectedVariant
    ? {
        id: selectedVariant.id,
        name: selectedVariant.name ?? selectedVariant.sku ?? '',
        price: selectedVariant.price,
        image: selectedVariant.image_url,
      }
    : undefined;

  const handleAddToCart = () => {
    if (variantBlocked || outOfStock) return;
    addToCart(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: effectivePrice,
        image: effectiveImage,
      },
      {
        quantity,
        variant: variantDescriptor,
      },
    );
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  const handleBuyNow = () => {
    if (variantBlocked || outOfStock) return;
    setBuyNow({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: effectivePrice,
      image: effectiveImage,
      quantity,
      variant_id: selectedVariant?.id,
      variant_name: selectedVariant?.name ?? undefined,
    });
    router.push('/checkout?buyNow=1');
  };

  return (
    <div className={styles.panel}>
      {/* Price + freeship badge */}
      <div className={styles.priceRow}>
        <div className={styles.priceCol}>
          <div className={styles.priceLine}>
            <span className={styles.price}>{formatVND(effectivePrice)}</span>
            {effectiveOldPrice && discountPercent > 0 && (
              <>
                <span className={styles.oldPrice}>{formatVND(effectiveOldPrice)}</span>
                <span className={styles.discount}>-{discountPercent}%</span>
              </>
            )}
          </div>
          <FreeshipBadge threshold={freeshipThreshold} currentPrice={effectivePrice * quantity} />
        </div>

        <div className={styles.stockStatus}>
          {outOfStock ? (
            <span className={styles.outOfStock}>Hết hàng</span>
          ) : effectiveStock < 5 ? (
            <span className={styles.lowStock}>
              <Sparkles size={16} /> Sắp hết hàng
            </span>
          ) : (
            <span className={styles.inStock}>
              <Check size={16} /> Còn hàng
            </span>
          )}
        </div>
      </div>

      {/* Variants */}
      {hasVariants && (
        <div className={styles.variantsBlock}>
          <VariantSelector variants={variants} onVariantChange={setSelectedVariant} />
        </div>
      )}

      {/* Quantity */}
      <div className={styles.qtyBlock}>
        <span className={styles.qtyLabel}>Số lượng</span>
        <QuantitySelector
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={Math.max(1, effectiveStock || 99)}
          disabled={outOfStock}
        />
        {!outOfStock && hasVariants && selectedVariant && (
          <span className={styles.qtyHint}>Còn {effectiveStock} sản phẩm</span>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={variantBlocked || outOfStock}
          className={`${styles.addBtn} ${justAdded ? styles.addBtnSuccess : ''}`}
        >
          {justAdded ? <Check size={20} /> : <ShoppingCart size={20} />}
          {justAdded ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ'}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={variantBlocked || outOfStock}
          className={styles.buyBtn}
        >
          Mua ngay
        </button>
      </div>

      {variantBlocked && (
        <p className={styles.warning}>Vui lòng chọn phiên bản trước khi mua.</p>
      )}
    </div>
  );
}
