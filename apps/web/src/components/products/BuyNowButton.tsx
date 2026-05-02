'use client';

import { useRouter } from 'next/navigation';
import type { ProductCardProduct } from './ProductCard';
import { setBuyNow } from '@/lib/buyNow';

interface BuyNowButtonProps {
  product: ProductCardProduct;
  quantity?: number;
  className?: string;
  children?: React.ReactNode;
}

export default function BuyNowButton({ product, quantity = 1, className, children }: BuyNowButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    setBuyNow({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
    });
    router.push('/checkout?buyNow=1');
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children ?? 'Mua ngay'}
    </button>
  );
}
