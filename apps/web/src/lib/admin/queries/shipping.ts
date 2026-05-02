import { createClient } from '@/lib/supabase/server';
import type { BrandSettings, ShippingConfig } from '@/app/actions/admin/shipping';

export type ShippingRateRow = {
  id: string;
  province_code: string;
  province_name: string;
  base_fee: number;
  per_kg_fee: number;
  estimated_days: number;
  is_active: boolean;
  notes: string | null;
};

export async function listShippingRates(): Promise<ShippingRateRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shipping_rates')
    .select('id, province_code, province_name, base_fee, per_kg_fee, estimated_days, is_active, notes')
    .order('province_name');
  return (data ?? []) as ShippingRateRow[];
}

export async function getBrandSettings(): Promise<BrandSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'brand')
    .maybeSingle();
  return ((data as { value?: BrandSettings } | null)?.value as BrandSettings | undefined) ?? null;
}

export async function getShippingConfig(): Promise<ShippingConfig | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'shipping_config')
    .maybeSingle();
  return ((data as { value?: ShippingConfig } | null)?.value as ShippingConfig | undefined) ?? null;
}
