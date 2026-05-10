'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true; id: string } | { ok: false; error: string };

export type ReviewSubmitInput = {
  product_id: string;
  product_slug: string;
  rating: number;
  comment: string;
  images: { url: string; alt?: string }[];
};

/**
 * Check if a user has purchased and received (completed order) a specific product.
 */
export async function canReviewProduct(productId: string): Promise<{ canReview: boolean; reason?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { canReview: false, reason: 'Bạn cần đăng nhập.' };

  // Check for completed order containing this product
  const { data: orderItem } = await supabase
    .from('order_items')
    .select('id, order_id, orders!inner(status, user_id)')
    .eq('product_id', productId)
    .eq('orders.user_id' as never, user.id)
    .eq('orders.status' as never, 'completed')
    .limit(1)
    .maybeSingle();

  if (!orderItem) {
    return {
      canReview: false,
      reason: 'Bạn cần mua và nhận hàng thành công trước khi đánh giá sản phẩm này.',
    };
  }

  // Check if user already reviewed
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingReview) {
    return { canReview: true, reason: 'Bạn đã đánh giá sản phẩm này. Gửi lại sẽ cập nhật đánh giá cũ.' };
  }

  return { canReview: true };
}

export async function submitReview(input: ReviewSubmitInput): Promise<Result> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Bạn cần đăng nhập để đánh giá.' };

  if (!input.product_id) return { ok: false, error: 'Thiếu product_id' };

  // Server-side purchase verification
  const { data: hasPurchased } = await supabase
    .from('order_items')
    .select('id, orders!inner(status, user_id)')
    .eq('product_id', input.product_id)
    .eq('orders.user_id' as never, user.id)
    .eq('orders.status' as never, 'completed')
    .limit(1)
    .maybeSingle();

  if (!hasPurchased) {
    return {
      ok: false,
      error: 'Bạn cần mua và nhận hàng thành công trước khi đánh giá sản phẩm này.',
    };
  }

  const rating = Math.max(1, Math.min(5, Math.floor(input.rating)));
  const comment = (input.comment ?? '').trim().slice(0, 2000);
  const images = (input.images ?? []).slice(0, 6).map((img) => ({
    url: String(img.url),
    alt: img.alt ? String(img.alt).slice(0, 120) : undefined,
  }));

  // Upsert by (product_id, user_id) so a re-review overwrites; use insert with on_conflict via update
  const payload = {
    product_id: input.product_id,
    user_id: user.id,
    rating,
    comment,
    images,
  };

  // Try insert; if unique constraint, fall back to update
  const { data: inserted, error: insertErr } = await supabase
    .from('reviews')
    .insert(payload as never)
    .select('id')
    .single();

  let reviewId: string | null = null;
  if (insertErr) {
    if (insertErr.code === '23505' /* unique_violation */) {
      const { data: updated, error: updErr } = await supabase
        .from('reviews')
        .update({ rating, comment, images } as never)
        .eq('product_id', input.product_id)
        .eq('user_id', user.id)
        .select('id')
        .single();
      if (updErr) return { ok: false, error: updErr.message };
      reviewId = (updated as { id: string }).id;
    } else {
      // Handle the PURCHASE_REQUIRED error from trigger
      if (insertErr.message?.includes('PURCHASE_REQUIRED')) {
        return {
          ok: false,
          error: 'Bạn cần mua và nhận hàng thành công trước khi đánh giá sản phẩm này.',
        };
      }
      return { ok: false, error: insertErr.message };
    }
  } else {
    reviewId = (inserted as { id: string }).id;
  }

  // Update product rating and reviews_count from actual reviews
  const { data: stats } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', input.product_id);

  if (stats && stats.length > 0) {
    const avgRating = stats.reduce((sum, r) => sum + (r as { rating: number }).rating, 0) / stats.length;
    await supabase
      .from('products')
      .update({
        rating: Math.round(avgRating * 10) / 10,
        reviews_count: stats.length,
      } as never)
      .eq('id', input.product_id);
  }

  revalidatePath(`/products/${input.product_slug}`);
  return { ok: true, id: reviewId! };
}
