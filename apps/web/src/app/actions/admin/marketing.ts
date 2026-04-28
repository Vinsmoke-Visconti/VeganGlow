'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true; id?: string } | { ok: false; error: string };

export type VoucherInput = {
  id?: string;
  code: string;
  title: string;
  discount_type: 'percent' | 'fixed' | 'shipping';
  discount_value: number;
  min_order: number;
  quota: number;
  starts_at: string | null;
  expires_at: string | null;
  status: 'active' | 'scheduled' | 'expired' | 'draft';
};

export async function upsertVoucher(input: VoucherInput): Promise<Result> {
  const supabase = await createClient();
  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase.from('vouchers').update(rest as never).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/marketing');
    return { ok: true, id };
  }
  const { id: _ignored, ...rest } = input;
  void _ignored;
  const { data, error } = await supabase.from('vouchers').insert(rest as never).select('id').single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing');
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteVoucher(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('vouchers').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing');
  return { ok: true };
}

export type BannerInput = {
  id?: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cover_gradient: string | null;
  link_url: string | null;
  placement: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  display_order?: number;
};

export async function upsertBanner(input: BannerInput): Promise<Result> {
  const supabase = await createClient();
  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase.from('banners').update(rest as never).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/marketing');
    return { ok: true, id };
  }
  const { id: _ignored, ...rest } = input;
  void _ignored;
  const { data, error } = await supabase.from('banners').insert(rest as never).select('id').single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing');
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteBanner(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing');
  return { ok: true };
}

export type FlashSaleInput = {
  id?: string;
  product_id: string;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'active' | 'expired' | 'draft';
};

export async function upsertFlashSale(input: FlashSaleInput): Promise<Result> {
  const supabase = await createClient();
  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase.from('flash_sales').update(rest as never).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/marketing');
    return { ok: true, id };
  }
  const { id: _ignored, ...rest } = input;
  void _ignored;
  const { data, error } = await supabase.from('flash_sales').insert(rest as never).select('id').single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing');
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteFlashSale(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('flash_sales').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing');
  return { ok: true };
}
