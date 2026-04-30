'use client';

import { useCart } from '@/context/CartContext';
import { useState } from 'react';
import { ShoppingCart, Check, Plus } from 'lucide-react';
import type { ProductCardProduct } from './ProductCard';

interface AddToCartButtonProps {
  product: ProductCardProduct;
  className?: string;
  variant?: 'default' | 'icon';
}

export default function AddToCartButton({ product, className, variant = 'default' }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  if (variant === 'icon') {
    return (
      <button 
        onClick={handleAdd}
        className={className}
        title="Thêm vào giỏ hàng"
      >
        {isAdded ? <Check size={20} /> : <Plus size={20} />}
      </button>
    );
  }

  return (
    <button 
      onClick={handleAdd}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        borderRadius: '9999px',
        fontWeight: '600',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        border: 'none',
        background: isAdded ? '#10b981' : 'var(--color-primary)',
        color: 'white',
      }}
    >
      {isAdded ? (
        <>
          <Check size={20} />
          <span>Đã thêm</span>
        </>
      ) : (
        <>
          <ShoppingCart size={20} />
          <span>Thêm vào giỏ</span>
        </>
      )}
    </button>
  );
}
