import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProductCard, { type ProductCardProduct } from '@/components/products/ProductCard';
import ProductGallery from '@/components/products/ProductGallery';
import ProductTabs from '@/components/products/ProductTabs';
import DetailActions from '@/components/products/DetailActions';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Star, Truck, RefreshCw } from 'lucide-react';
import { cacheGet, cacheSet } from '@/lib/redis';
import type { Database } from '@/types/database';
import type { Variant } from '@/components/products/VariantSelector';
import type { GalleryImage } from '@/components/products/ProductGallery';

type ProductRow = Database['public']['Tables']['products']['Row'];

type DBImage = {
  id: string;
  url: string;
  alt_text: string | null;
  position: number;
  is_thumbnail: boolean;
};

type DBVariant = {
  id: string;
  sku: string | null;
  name: string | null;
  attributes: Record<string, string | number | boolean | null> | null;
  price: number | string;
  compare_at_price: number | string | null;
  stock: number;
  image_url: string | null;
  position: number;
  is_active: boolean;
};

// Schema fields not yet reflected in generated Database types — added explicitly.
type ProductExtraColumns = {
  description_html?: string | null;
  short_description?: string | null;
  sku?: string | null;
  has_variants?: boolean | null;
};

type ProductWithExtras = ProductRow &
  ProductExtraColumns & {
    categories?: { id: string; name: string; slug: string } | null;
    product_images?: DBImage[] | null;
    product_variants?: DBVariant[] | null;
  };

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient();
  const { slug } = await params;

  const cacheKey = `product:v2:${slug}`;
  let product = await cacheGet<ProductWithExtras>(cacheKey);

  if (product && !product.is_active) {
    product = null;
  }

  if (!product) {
    const { data: dbProduct } = await supabase
      .from('products')
      .select(
        `
        *,
        categories:category_id (id, name, slug),
        product_images (id, url, alt_text, position, is_thumbnail),
        product_variants (id, sku, name, attributes, price, compare_at_price, stock, image_url, position, is_active)
      `,
      )
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (!dbProduct) notFound();
    product = dbProduct as unknown as ProductWithExtras;
    await cacheSet(cacheKey, product, 3600);
  }

  const typed: ProductWithExtras = product;

  const relatedCacheKey = `related:v2:${typed.category_id}:${typed.id}`;
  let relatedProducts = await cacheGet<ProductCardProduct[]>(relatedCacheKey);

  if (!relatedProducts) {
    const { data: dbRelated } = await supabase
      .from('products')
      .select('*, categories:category_id (id, name, slug)')
      .eq('category_id', typed.category_id ?? '')
      .eq('is_active', true)
      .neq('id', typed.id)
      .limit(4);

    relatedProducts = ((dbRelated ?? []) as unknown as ProductCardProduct[]) ?? [];
    await cacheSet(relatedCacheKey, relatedProducts, 3600);
  }

  const typedRelated: ProductCardProduct[] = relatedProducts ?? [];

  const images: GalleryImage[] = (typed.product_images ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ id: i.id, url: i.url, alt_text: i.alt_text }));

  const variants: Variant[] = (typed.product_variants ?? []).map((v) => ({
    id: v.id,
    sku: v.sku,
    name: v.name,
    attributes: v.attributes,
    price: Number(v.price),
    compare_at_price: v.compare_at_price != null ? Number(v.compare_at_price) : null,
    stock: v.stock,
    image_url: v.image_url,
    position: v.position,
    is_active: v.is_active,
  }));

  const hasVariants = Boolean(typed.has_variants) && variants.length > 0;

  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 pb-28 lg:pb-24">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-text-muted py-6">
        <Link href="/" className="hover:text-text">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-text">
          Sản phẩm
        </Link>
        {typed.categories && (
          <>
            <span>/</span>
            <Link href={`/products?category=${typed.categories.slug}`} className="hover:text-text">
              {typed.categories.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-text">{typed.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
        {/* Gallery */}
        <ProductGallery images={images} fallback={typed.image} productName={typed.name} />

        {/* Info panel */}
        <div className="lg:sticky lg:top-24 lg:self-start flex flex-col gap-6">
          {typed.categories && (
            <span className="text-[11px] uppercase tracking-[0.2em] text-primary">
              {typed.categories.name}
            </span>
          )}

          <h1 className="font-serif text-3xl lg:text-5xl font-medium tracking-tight text-text leading-tight">
            {typed.name}
          </h1>

          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span>SKU: {typed.sku ?? `VG-${typed.id.substring(0, 6).toUpperCase()}`}</span>
            {(typed.reviews_count ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 text-secondary">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={i < Math.round(typed.rating ?? 0) ? 'currentColor' : 'none'}
                    />
                  ))}
                </span>
                <span>
                  {Number(typed.rating ?? 0).toFixed(1)} · {typed.reviews_count} đánh giá
                </span>
              </span>
            ) : (
              <span>Chưa có đánh giá</span>
            )}
          </div>

          {typed.short_description && (
            <p className="text-text-secondary leading-relaxed">{typed.short_description}</p>
          )}

          <DetailActions
            product={{
              id: typed.id,
              slug: typed.slug,
              name: typed.name,
              price: Number(typed.price),
              image: typed.image,
              stock: typed.stock,
            }}
            variants={variants}
            hasVariants={hasVariants}
          />

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border-light">
            <div className="flex flex-col items-center text-center gap-2">
              <Truck size={20} className="text-primary" />
              <span className="text-xs text-text-secondary leading-tight">Giao hàng hỏa tốc</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <RefreshCw size={20} className="text-primary" />
              <span className="text-xs text-text-secondary leading-tight">Đổi trả 7 ngày</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              <span className="text-xs text-text-secondary leading-tight">Kiểm nghiệm an toàn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ProductTabs
        descriptionHtml={typed.description_html}
        descriptionPlain={typed.description}
        ingredients={typed.ingredients}
      />

      {/* Reviews */}
      <ReviewsSection
        productId={typed.id}
        productRating={typed.rating ?? 0}
        reviewsCount={typed.reviews_count ?? 0}
      />

      {/* Related */}
      {typedRelated.length > 0 && (
        <section className="mt-24">
          <h2 className="font-serif text-3xl lg:text-4xl font-medium tracking-tight text-text mb-8">
            Bạn cũng có thể thích
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {typedRelated.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type ReviewWithProfile = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

async function ReviewsSection({
  productId,
  productRating,
  reviewsCount,
}: {
  productId: string;
  productRating: number;
  reviewsCount: number;
}) {
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profiles(full_name, avatar_url)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  const list = (reviews as ReviewWithProfile[] | null) ?? [];

  return (
    <section className="mt-24 max-w-3xl mx-auto px-2">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="font-serif text-3xl lg:text-4xl font-medium tracking-tight text-text">
            Đánh giá thực tế
          </h2>
          <p className="mt-2 text-text-secondary">Tất cả đánh giá từ khách hàng đã mua hàng.</p>
        </div>

        {(reviewsCount ?? 0) > 0 && (
          <div className="flex items-center gap-3">
            <span className="font-serif text-4xl font-semibold text-text">
              {Number(productRating ?? 0).toFixed(1)}
            </span>
            <div className="flex flex-col">
              <span className="inline-flex items-center gap-0.5 text-secondary">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i < Math.round(productRating ?? 0) ? 'currentColor' : 'none'}
                  />
                ))}
              </span>
              <span className="text-xs text-text-muted">{reviewsCount} đánh giá</span>
            </div>
          </div>
        )}
      </div>

      {list.length > 0 ? (
        <ul className="flex flex-col">
          {list.map((review) => (
            <li key={review.id} className="border-b border-border-light py-6 first:border-t">
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src={
                    review.profiles?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(review.profiles?.full_name || 'U')}`
                  }
                  alt={review.profiles?.full_name || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full"
                  unoptimized
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-text">
                    {review.profiles?.full_name || 'Khách hàng ẩn danh'}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(review.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <span className="ml-auto inline-flex items-center gap-0.5 text-secondary">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < review.rating ? 'currentColor' : 'none'} />
                  ))}
                </span>
              </div>
              <p className="text-text-secondary leading-relaxed">{review.comment}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-text-muted py-12">
          Sản phẩm chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm!
        </p>
      )}
    </section>
  );
}
