import { createClient } from '@/lib/supabase/server';

export type Voucher = {
  id: string;
  code: string;
  title: string;
  discount_type: 'percent' | 'fixed' | 'shipping';
  discount_value: number;
  min_order: number;
  quota: number;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  status: 'active' | 'scheduled' | 'expired' | 'draft';
  created_at: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cover_gradient: string | null;
  link_url: string | null;
  placement: string | null;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  display_order: number | null;
  created_at: string | null;
};

export type FlashSale = {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'active' | 'expired' | 'draft';
  created_at: string;
};

export async function listVouchers(): Promise<Voucher[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as Voucher[];
}

export async function getVoucher(id: string): Promise<Voucher | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('vouchers').select('*').eq('id', id).maybeSingle();
  return (data as Voucher | null) ?? null;
}

export async function listBanners(): Promise<Banner[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('banners')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as Banner[];
}

export async function getBanner(id: string): Promise<Banner | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('banners').select('*').eq('id', id).maybeSingle();
  return (data as Banner | null) ?? null;
}

export async function listFlashSales(): Promise<FlashSale[]> {
  const supabase = await createClient();
  type RawFlashRow = {
    id: string;
    product_id: string;
    discount_percent: number;
    starts_at: string;
    ends_at: string;
    status: 'scheduled' | 'active' | 'expired' | 'draft';
    created_at: string;
    product: { name: string; image: string | null } | null;
  };
  const { data } = await supabase
    .from('flash_sales')
    .select('id, product_id, discount_percent, starts_at, ends_at, status, created_at, product:products(name, image)')
    .order('starts_at', { ascending: false });
  return ((data ?? []) as unknown as RawFlashRow[]).map((r) => ({
    id: r.id,
    product_id: r.product_id,
    product_name: r.product?.name ?? '—',
    product_image: r.product?.image ?? null,
    discount_percent: r.discount_percent,
    starts_at: r.starts_at,
    ends_at: r.ends_at,
    status: r.status,
    created_at: r.created_at,
  }));
}
