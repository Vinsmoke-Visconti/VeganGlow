import { createClient } from '@/lib/supabase/server';

export type BrandInfo = {
  name: string;
  tagline: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  address: string;
};

export const DEFAULT_BRAND_INFO: BrandInfo = {
  name: 'VeganGlow',
  tagline: 'Mỹ phẩm thuần chay Việt Nam',
  logo_url: '',
  contact_email: '',
  contact_phone: '',
  address: '',
};

export type SiteAssets = {
  hero_bg: string;
  about_bg: string;
  auth_bg: string;
  cart_bg: string;
  contact_bg: string;
  profile_bg: string;
  products_bg: string;
  support_bg: string;
  wishlist_bg: string;
  blog_bg: string;
  cta_bg: string;
  logo_url: string;
  logo_light_url: string;
  footer_logo_url: string;
  favicon_url: string;
};

export const DEFAULT_SITE_ASSETS: SiteAssets = {
  hero_bg: '/images/hero.jpg',
  about_bg: '/images/about-long-bg.png',
  auth_bg: '/images/auth-bg.png',
  cart_bg: '/images/cart-bg.png',
  contact_bg: '/images/contact-bg.png',
  profile_bg: '/images/profile-bg.png',
  products_bg: '/images/products-bg.png',
  support_bg: '/images/support-bg.png',
  wishlist_bg: '/images/wishlist-bg.png',
  blog_bg: '/images/blog-detail-bg.png',
  cta_bg: '/images/cta-liquid-bg.png',
  logo_url: '/logo.jpg',
  logo_light_url: '/logo.jpg',
  footer_logo_url: '/logo.jpg',
  favicon_url: '/favicon.ico',
};

export async function getSystemSetting<T>(key: string, fallback: T): Promise<T> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (!data) return fallback;
  return ((data as { value: T }).value ?? fallback) as T;
}

export async function getBrandInfo(): Promise<BrandInfo> {
  return getSystemSetting<BrandInfo>('brand_info', DEFAULT_BRAND_INFO);
}

export async function getSiteAssets(): Promise<SiteAssets> {
  return getSystemSetting<SiteAssets>('site_assets', DEFAULT_SITE_ASSETS);
}
