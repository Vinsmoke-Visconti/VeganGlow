'use server';

import { cacheDelete } from '@/lib/redis';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { audit } from '@/lib/security/auditLog';

async function auditCtx() {
  const h = await headers();
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
    userAgent: h.get('user-agent'),
  };
}

type Result = { ok: true; id?: string } | { ok: false; error: string };

export type ProductInput = {
  id?: string;
  name: string;
  slug: string;
  price: number;
  category_id: string | null;
  image: string;
  description: string;
  ingredients: string;
  stock: number;
  is_active: boolean;
};

type ProductCacheRow = {
  slug: string;
  category_id: string | null;
};

async function getProductCacheRow(id: string): Promise<ProductCacheRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('slug, category_id')
    .eq('id', id)
    .maybeSingle();
  return (data as ProductCacheRow | null) ?? null;
}

async function invalidateProductCache(
  id: string,
  before?: ProductCacheRow | null,
  after?: Pick<ProductInput, 'slug' | 'category_id'> | null
) {
  const keys = new Set<string>();
  if (before?.slug) keys.add(`product:${before.slug}`);
  if (after?.slug) keys.add(`product:${after.slug}`);
  if (before?.category_id) keys.add(`related:${before.category_id}:${id}`);
  if (after?.category_id) keys.add(`related:${after.category_id}:${id}`);
  await cacheDelete([...keys]);
}

export async function upsertProduct(input: ProductInput): Promise<Result> {
  const supabase = await createClient();
  if (input.id) {
    const { id, ...rest } = input;
    const before = await getProductCacheRow(id);
    const { error } = await supabase.from('products').update(rest as never).eq('id', id);
    if (error) return { ok: false, error: error.message };
    await invalidateProductCache(id, before, rest);
    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${id}`);
    revalidatePath(`/products/${input.slug}`);
    await audit(
      {
        action: 'product.updated',
        severity: 'info',
        entity: 'product',
        entity_id: id,
        summary: `Updated product "${input.name}"`,
        details: { slug: input.slug, price: input.price, stock: input.stock },
      },
      await auditCtx()
    );
    return { ok: true, id };
  } else {
    const { id: _ignored, ...rest } = input;
    void _ignored;
    const { data, error } = await supabase
      .from('products')
      .insert(rest as never)
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    const newId = (data as { id: string }).id;
    await invalidateProductCache(newId, null, rest);
    revalidatePath('/admin/products');
    await audit(
      {
        action: 'product.created',
        severity: 'info',
        entity: 'product',
        entity_id: newId,
        summary: `Created product "${input.name}"`,
        details: { slug: input.slug, price: input.price, stock: input.stock },
      },
      await auditCtx()
    );
    return { ok: true, id: newId };
  }
}

export async function deleteProduct(id: string): Promise<Result> {
  const supabase = await createClient();
  const before = await getProductCacheRow(id);
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await invalidateProductCache(id, before, null);
  revalidatePath('/admin/products');
  await audit(
    {
      action: 'product.archived',
      severity: 'info',
      entity: 'product',
      entity_id: id,
      summary: `Deleted product`,
      details: { slug: before?.slug ?? null },
    },
    await auditCtx()
  );
  return { ok: true };
}

export async function toggleProductActive(id: string, isActive: boolean): Promise<Result> {
  const supabase = await createClient();
  const before = await getProductCacheRow(id);
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive } as never)
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  await invalidateProductCache(id, before, before);
  revalidatePath('/admin/products');
  if (before?.slug) revalidatePath(`/products/${before.slug}`);
  await audit(
    {
      action: isActive ? 'product.restored' : 'product.archived',
      severity: 'info',
      entity: 'product',
      entity_id: id,
      summary: isActive ? 'Activated product' : 'Deactivated product',
    },
    await auditCtx()
  );
  return { ok: true };
}
