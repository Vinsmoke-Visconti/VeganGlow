import { createBrowserClient } from '@/lib/supabase/client';

export const ADMIN_BUCKETS = {
  productImages: 'product-images',
  bannerImages: 'banner-images',
} as const;

export type AdminBucketKey = keyof typeof ADMIN_BUCKETS;

 export async function uploadAdminImage(
  bucket: AdminBucketKey,
  file: File,
  pathPrefix = '',
  customName?: string,
): Promise<{ url: string; path: string }> {
  const supabase = createBrowserClient();
   const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const safePrefix = pathPrefix.replace(/^\/+|\/+$/g, '');
  const randomSuffix = crypto.randomUUID().split('-')[0];
  
  // Use custom name if provided, otherwise fallback to timestamp+random
  const filename = customName 
    ? `${customName}-${randomSuffix}.${ext}`
    : `${Date.now()}-${randomSuffix}.${ext}`;
    
  const path = safePrefix ? `${safePrefix}/${filename}` : filename;

  const { error } = await supabase.storage
    .from(ADMIN_BUCKETS[bucket])
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;

  const { data: pub } = supabase.storage.from(ADMIN_BUCKETS[bucket]).getPublicUrl(path);
  return { url: pub.publicUrl, path };
}

export async function deleteAdminImage(bucket: AdminBucketKey, path: string): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase.storage.from(ADMIN_BUCKETS[bucket]).remove([path]);
  if (error) throw error;
}
