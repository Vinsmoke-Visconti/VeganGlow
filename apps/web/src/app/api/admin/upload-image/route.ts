import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';

/**
 * Admin image upload — converts to WebP, uploads to Supabase Storage `products` bucket.
 * Returns { url, width, height }.
 *
 * Permission: any staff with products:create or products:update (RLS on storage.objects).
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Defense-in-depth: middleware already enforces, but re-check role
  const role = user.app_metadata?.staff_role as string | undefined;
  if (!role || role === 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File quá lớn (>5MB)' }, { status: 413 });
  }
  const mime = (file as Blob & { type?: string }).type ?? '';
  if (!ALLOWED.includes(mime)) {
    return NextResponse.json({ error: 'Định dạng không hỗ trợ' }, { status: 415 });
  }

  // Convert to WebP at quality 82, max width 1600
  const buf = Buffer.from(await file.arrayBuffer());
  let webp: Buffer;
  let metadata: { width: number; height: number };
  try {
    const pipeline = sharp(buf).rotate().resize({
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    });
    const meta = await pipeline.metadata();
    metadata = { width: meta.width ?? 0, height: meta.height ?? 0 };
    webp = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
  } catch (err) {
    return NextResponse.json(
      { error: 'Image processing failed: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 422 }
    );
  }

   const slug = form.get('slug') as string | null;
  const randomSuffix = Math.random().toString(36).slice(2, 6);
  const baseName = slug ? `${slug}-${randomSuffix}` : `${Date.now()}-${randomSuffix}`;
  const filename = `products/${user.id}/${baseName}.webp`;
  const { error: uploadErr } = await supabase.storage
    .from('products')
    .upload(filename, webp, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from('products').getPublicUrl(filename);

  return NextResponse.json({
    url: pub.publicUrl,
    width: metadata.width,
    height: metadata.height,
    sizeBytes: webp.length,
  });
}
