'use client';

import { useCart } from '@/context/CartContext';
import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';

export default function AddToCartButton({ product, className }: { product: any, className?: string }) {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

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
        background: isAdded ? 'var(--color-success)' : 'var(--gradient-primary)',
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
