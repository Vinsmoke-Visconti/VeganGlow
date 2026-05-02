'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { audit } from '@/lib/security/auditLog';

type Result = { ok: true; id?: string } | { ok: false; error: string };

export type VariantInput = {
  id?: string;
  product_id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price: number;
  compare_at_price: number | null;
  stock: number;
  image_url: string | null;
  position: number;
  is_active: boolean;
};

async function auditCtx() {
  const h = await headers();
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
    userAgent: h.get('user-agent'),
  };
}

export async function upsertVariant(input: VariantInput): Promise<Result> {
  const supabase = await createClient();

  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase
      .from('product_variants')
      .update(rest as never)
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/admin/products/${input.product_id}`);
    revalidatePath('/admin/products');
    await audit(
      {
        action: 'product.updated',
        severity: 'info',
        entity: 'product',
        entity_id: input.product_id,
        summary: `Variant updated: ${input.sku}`,
        details: { variant_id: id, sku: input.sku, attributes: input.attributes },
      },
      await auditCtx()
    );
    return { ok: true, id };
  }

  const { id: _ignored, ...rest } = input;
  void _ignored;
  const { data, error } = await supabase
    .from('product_variants')
    .insert(rest as never)
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  const newId = (data as { id: string }).id;

  // Mark parent product as has_variants
  await supabase
    .from('products')
    .update({ has_variants: true } as never)
    .eq('id', input.product_id);

  revalidatePath(`/admin/products/${input.product_id}`);
  revalidatePath('/admin/products');
  await audit(
    {
      action: 'product.created',
      severity: 'info',
      entity: 'product',
      entity_id: input.product_id,
      summary: `Variant created: ${input.sku}`,
      details: { variant_id: newId, sku: input.sku, attributes: input.attributes },
    },
    await auditCtx()
  );
  return { ok: true, id: newId };
}

export async function deleteVariant(id: string, productId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('product_variants').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  // If no more variants, unset has_variants
  const { count } = await supabase
    .from('product_variants')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);
  if ((count ?? 0) === 0) {
    await supabase
      .from('products')
      .update({ has_variants: false } as never)
      .eq('id', productId);
  }

  revalidatePath(`/admin/products/${productId}`);
  await audit(
    {
      action: 'product.archived',
      severity: 'info',
      entity: 'product',
      entity_id: productId,
      summary: `Variant deleted`,
      details: { variant_id: id },
    },
    await auditCtx()
  );
  return { ok: true };
}

export async function adjustVariantStock(
  id: string,
  delta: number,
  reason: 'stock_in' | 'stock_out' | 'correction'
): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_variants')
    .select('stock, product_id, sku')
    .eq('id', id)
    .single();
  if (error) return { ok: false, error: error.message };
  const row = data as { stock: number; product_id: string; sku: string };
  const newStock = Math.max(0, row.stock + delta);

  const { error: updateErr } = await supabase
    .from('product_variants')
    .update({ stock: newStock } as never)
    .eq('id', id);
  if (updateErr) return { ok: false, error: updateErr.message };

  await audit(
    {
      action: 'product.stock_changed',
      severity: 'info',
      entity: 'product',
      entity_id: row.product_id,
      summary: `Variant ${row.sku} stock ${delta > 0 ? '+' : ''}${delta} (${reason})`,
      details: { variant_id: id, delta, before: row.stock, after: newStock, reason },
    },
    await auditCtx()
  );

  revalidatePath(`/admin/products/${row.product_id}`);
  return { ok: true };
}
