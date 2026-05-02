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

export async function submitReview(input: ReviewSubmitInput): Promise<Result> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Bạn cần đăng nhập để đánh giá.' };

  if (!input.product_id) return { ok: false, error: 'Thiếu product_id' };
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
      return { ok: false, error: insertErr.message };
    }
  } else {
    reviewId = (inserted as { id: string }).id;
  }

  revalidatePath(`/products/${input.product_slug}`);
  return { ok: true, id: reviewId! };
}
