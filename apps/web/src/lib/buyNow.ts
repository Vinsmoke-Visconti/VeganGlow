'use client';

import type { CartItem } from '@/context/CartContext';
import { normalizeProductImage } from '@/lib/imageUrl';

const KEY = 'vg-buy-now';

export type BuyNowItem = CartItem;

export type BuyNowSeed = {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  image?: string | null;
  image_url?: string | null;
  quantity?: number;
};

export function setBuyNow(seed: BuyNowSeed): BuyNowItem | null {
  if (typeof window === 'undefined') return null;
  const item: BuyNowItem = {
    id: seed.id,
    slug: seed.slug || seed.id,
    name: seed.name,
    price: seed.price,
    image: normalizeProductImage(seed.image || seed.image_url) ?? '',
    quantity: Math.max(1, seed.quantity ?? 1),
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(item));
  } catch {
    return null;
  }
  return item;
}

export function getBuyNow(): BuyNowItem | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BuyNowItem;
    if (!parsed?.id || !parsed?.name || typeof parsed.price !== 'number') return null;
    return { ...parsed, quantity: Math.max(1, parsed.quantity ?? 1) };
  } catch {
    return null;
  }
}

export function updateBuyNowQuantity(quantity: number): BuyNowItem | null {
  const current = getBuyNow();
  if (!current) return null;
  const next: BuyNowItem = { ...current, quantity: Math.max(1, quantity) };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return current;
  }
  return next;
}

export function clearBuyNow() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
