/**
 * Normalize legacy local image URLs.
 *
 * Some product/category rows in the DB still reference `/images/*.png` paths,
 * but the files on disk are JPEG bytes saved with a `.png` extension. Next.js
 * Image rejects them as "not a valid image". We rename the on-disk files to
 * `.jpg` and rewrite incoming `.png` URLs that live under `/images/` so they
 * resolve correctly without needing a DB migration first.
 */
export function normalizeProductImage(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (src.startsWith('/images/') && src.endsWith('.png')) {
    return src.slice(0, -4) + '.jpg';
  }
  return src;
}
