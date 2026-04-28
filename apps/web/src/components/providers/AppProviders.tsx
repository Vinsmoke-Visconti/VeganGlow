'use client';

import { CartProvider } from '@/context/CartContext';
import { ReactNode } from 'react';

/**
 * AppProviders - A Client Component wrapper for all context providers.
 * This ensures that context is available throughout the entire application
 * while keeping the root layout as a Server Component.
 */
export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  );
}
