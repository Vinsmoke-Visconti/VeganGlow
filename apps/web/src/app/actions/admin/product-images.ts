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

export type ProductImageInput = {
  product_id: string;
  url: string;
  alt_text: string | null;
  position: number;
  is_thumbnail: boolean;
  width: number | null;
  height: number | null;
};

export async function addProductImage(input: ProductImageInput): Promise<Result> {
  const supabase = await createClient();

  // If marking as thumbnail, unset previous thumbnail first (one per product)
  if (input.is_thumbnail) {
    await supabase
      .from('product_images')
      .update({ is_thumbnail: false } as never)
      .eq('product_id', input.product_id)
      .eq('is_thumbnail', true);
  }

  const { data, error } = await supabase
    .from('product_images')
    .insert(input as never)
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  // If thumbnail, sync products.image (legacy column for storefront cards)
  if (input.is_thumbnail) {
    await supabase
      .from('products')
      .update({ image: input.url } as never)
      .eq('id', input.product_id);
  }

  revalidatePath(`/admin/products/${input.product_id}`);
  await audit(
    {
      action: 'product.updated',
      severity: 'info',
      entity: 'product',
      entity_id: input.product_id,
      summary: `Added image (${input.is_thumbnail ? 'thumbnail' : 'gallery'})`,
      details: { url: input.url, position: input.position },
    },
    await auditCtx()
  );
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteProductImage(id: string, productId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from('product_images')
    .select('url, is_thumbnail')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('product_images').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  // If we removed the thumbnail, clear products.image (or set to next gallery image)
  if ((row as { is_thumbnail?: boolean } | null)?.is_thumbnail) {
    const { data: next } = await supabase
      .from('product_images')
      .select('url')
      .eq('product_id', productId)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle();
    await supabase
      .from('products')
      .update({ image: (next as { url?: string } | null)?.url ?? '' } as never)
      .eq('id', productId);
  }

  revalidatePath(`/admin/products/${productId}`);
  await audit(
    {
      action: 'product.updated',
      severity: 'info',
      entity: 'product',
      entity_id: productId,
      summary: 'Removed image',
      details: { image_id: id },
    },
    await auditCtx()
  );
  return { ok: true };
}

export async function reorderProductImages(
  productId: string,
  orderedIds: string[]
): Promise<Result> {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('product_images')
      .update({ position: i } as never)
      .eq('id', orderedIds[i]);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}

export async function setThumbnail(imageId: string, productId: string): Promise<Result> {
  const supabase = await createClient();

  // Unset all current thumbnails for this product
  await supabase
    .from('product_images')
    .update({ is_thumbnail: false } as never)
    .eq('product_id', productId);

  const { data: row, error } = await supabase
    .from('product_images')
    .update({ is_thumbnail: true } as never)
    .eq('id', imageId)
    .select('url')
    .single();
  if (error) return { ok: false, error: error.message };

  // Sync legacy products.image column
  await supabase
    .from('products')
    .update({ image: (row as { url: string }).url } as never)
    .eq('id', productId);

  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}
