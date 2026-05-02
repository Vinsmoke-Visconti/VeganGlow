'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { audit } from '@/lib/security/auditLog';

type Result = { ok: true; id?: string } | { ok: false; error: string };

async function auditCtx() {
  const h = await headers();
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
    userAgent: h.get('user-agent'),
  };
}

export type ShippingRateInput = {
  id?: string;
  province_code: string;
  province_name: string;
  base_fee: number;
  per_kg_fee: number;
  estimated_days: number;
  is_active: boolean;
  notes: string | null;
};

export async function upsertShippingRate(input: ShippingRateInput): Promise<Result> {
  const supabase = await createClient();

  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase
      .from('shipping_rates')
      .update(rest as never)
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/settings');
    await audit(
      {
        action: 'setting.updated',
        severity: 'info',
        entity: 'setting',
        details: { key: 'shipping_rate', new: { province: input.province_code, ...rest } },
      },
      await auditCtx()
    );
    return { ok: true, id };
  }

  const { id: _ignored, ...rest } = input;
  void _ignored;
  const { data, error } = await supabase
    .from('shipping_rates')
    .insert(rest as never)
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/settings');
  await audit(
    {
      action: 'setting.updated',
      severity: 'info',
      entity: 'setting',
      details: { key: 'shipping_rate_added', new: { province: input.province_code, ...rest } },
    },
    await auditCtx()
  );
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteShippingRate(id: string, provinceCode: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('shipping_rates').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/settings');
  await audit(
    {
      action: 'setting.updated',
      severity: 'info',
      entity: 'setting',
      details: { key: 'shipping_rate_deleted', new: { province: provinceCode, deleted: true } },
    },
    await auditCtx()
  );
  return { ok: true };
}

export type BrandSettings = {
  name: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  hotline: string;
  email: string;
  address: string;
  social: {
    facebook: string;
    instagram: string;
    tiktok: string;
    youtube: string;
  };
};

export async function updateBrandSettings(input: BrandSettings): Promise<Result> {
  const supabase = await createClient();
  const { data: prev } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'brand')
    .maybeSingle();

  const { error } = await supabase
    .from('system_settings')
    .upsert({ key: 'brand', value: input as never } as never);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  revalidatePath('/admin/settings');

  await audit(
    {
      action: 'setting.updated',
      severity: 'info',
      entity: 'setting',
      details: { key: 'brand', old: (prev as { value?: unknown } | null)?.value ?? null, new: input },
    },
    await auditCtx()
  );

  return { ok: true };
}

export type ShippingConfig = {
  freeship_threshold_vnd: number;
  default_weight_kg: number;
  currency: string;
  estimated_processing_hours: number;
};

export async function updateShippingConfig(input: ShippingConfig): Promise<Result> {
  const supabase = await createClient();
  const { data: prev } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'shipping_config')
    .maybeSingle();

  const { error } = await supabase
    .from('system_settings')
    .upsert({ key: 'shipping_config', value: input as never } as never);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/settings');
  revalidatePath('/checkout');

  await audit(
    {
      action: 'setting.updated',
      severity: 'info',
      entity: 'setting',
      details: { key: 'shipping_config', old: (prev as { value?: unknown } | null)?.value ?? null, new: input },
    },
    await auditCtx()
  );

  return { ok: true };
}
