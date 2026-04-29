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
