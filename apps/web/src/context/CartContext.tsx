'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { normalizeProductImage } from '@/lib/imageUrl';

export type CartItem = {
  id: string;            // unique cart line key — product_id or `${product_id}__${variant_id}`
  product_id: string;    // always the underlying product id
  variant_id?: string;
  variant_name?: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

export type CartProduct = {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  image?: string | null;
  image_url?: string | null;
};

export type AddToCartOptions = {
  quantity?: number;
  variant?: {
    id: string;
    name: string;
    price: number;
    image?: string | null;
  };
};

export type LastAddedInfo = {
  id: string;
  name: string;
  image: string;
  at: number;
};

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (product: CartProduct, options?: AddToCartOptions) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalCount: number;
  lastAdded: LastAddedInfo | null;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function buildLineKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}__${variantId}` : productId;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastAdded, setLastAdded] = useState<LastAddedInfo | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('vg-cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart) as CartItem[];
        // Backfill product_id for items saved before the variant migration
        const migrated = parsed.map((item) => ({
          ...item,
          product_id: item.product_id ?? item.id,
        }));
        setCartItems(migrated);
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('vg-cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isLoaded]);

  const addToCart = (product: CartProduct, options: AddToCartOptions = {}) => {
    const qty = Math.max(1, Math.floor(options.quantity ?? 1));
    const variant = options.variant;
    const lineId = buildLineKey(product.id, variant?.id);
    const variantImage = variant?.image ?? null;
    const normalizedImage =
      normalizeProductImage(variantImage || product.image || product.image_url) ?? '';
    const linePrice = variant?.price ?? product.price;
    const lineName = variant?.name ? `${product.name} — ${variant.name}` : product.name;

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === lineId);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === lineId ? { ...item, quantity: item.quantity + qty } : item,
        );
      }
      return [
        ...prevItems,
        {
          id: lineId,
          product_id: product.id,
          variant_id: variant?.id,
          variant_name: variant?.name,
          slug: product.slug || product.id,
          name: lineName,
          price: linePrice,
          image: normalizedImage,
          quantity: qty,
        },
      ];
    });
    setLastAdded({
      id: lineId,
      name: lineName,
      image: normalizedImage,
      at: Date.now(),
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setCartItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setCartItems([]);

  const totalAmount = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const totalCount = cartItems.reduce(
    (count, item) => count + item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        totalCount,
        lastAdded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
