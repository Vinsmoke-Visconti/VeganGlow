'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Star, Camera, X, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { submitReview } from '@/app/actions/reviews';
import styles from './ReviewSubmitForm.module.css';

type Props = {
  productId: string;
  productSlug: string;
};

type DraftImage = { url: string; uploading?: boolean };

const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

export default function ReviewSubmitForm({ productId, productSlug }: Props) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [pending, start] = useTransition();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<DraftImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Bạn cần đăng nhập để upload ảnh.');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    for (const file of filesToUpload) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File ${file.name} > 3MB, bỏ qua.`);
        continue;
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      // Optimistic placeholder
      const tempIndex = images.length;
      setImages((prev) => [...prev, { url: '', uploading: true }]);
      const { error: upErr } = await supabase.storage
        .from('review-photos')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(upErr.message);
        // Remove optimistic entry
        setImages((prev) => prev.filter((_, i) => i !== tempIndex));
        continue;
      }
      const { data: pub } = supabase.storage.from('review-photos').getPublicUrl(path);
      setImages((prev) => {
        const next = [...prev];
        const placeholderIdx = next.findIndex((img) => img.uploading);
        if (placeholderIdx >= 0) {
          next[placeholderIdx] = { url: pub.publicUrl };
        }
        return next;
      });
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function submit() {
    if (!comment.trim()) {
      setError('Vui lòng viết nội dung đánh giá.');
      return;
    }
    setError(null);
    start(async () => {
      const res = await submitReview({
        product_id: productId,
        product_slug: productSlug,
        rating,
        comment: comment.trim(),
        images: images.filter((i) => i.url).map((i) => ({ url: i.url })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(true);
      setComment('');
      setImages([]);
      setRating(5);
      router.refresh();
      window.setTimeout(() => setSuccess(false), 3000);
    });
  }

  const anyUploading = images.some((i) => i.uploading);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={styles.form}
    >
      <h3 className={styles.title}>Viết đánh giá của bạn</h3>

      {/* Rating stars */}
      <div className={styles.starsRow}>
        <span className={styles.label}>Đánh giá:</span>
        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hoverRating || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
                className={styles.starBtn}
                aria-label={`${n} sao`}
              >
                <Star size={28} fill={active ? '#fbbf24' : 'none'} color={active ? '#fbbf24' : '#d1d5db'} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Comment */}
      <textarea
        className={styles.textarea}
        rows={4}
        placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
      />

      {/* Images */}
      <div className={styles.imagesRow}>
        {images.map((img, idx) => (
          <div key={`${img.url}-${idx}`} className={styles.imageItem}>
            {img.uploading ? (
              <div className={styles.imageLoading}>
                <Loader2 size={20} className={styles.spinner} />
              </div>
            ) : (
              <>
                <Image src={img.url} alt={`Ảnh ${idx + 1}`} width={80} height={80} className={styles.imagePreview} unoptimized />
                <button type="button" onClick={() => removeImage(idx)} className={styles.imageRemove} aria-label="Xóa ảnh">
                  <X size={12} />
                </button>
              </>
            )}
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <label className={styles.imageAdd}>
            <Camera size={20} />
            <span>Thêm ảnh</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>Cảm ơn bạn đã chia sẻ đánh giá!</p>}

      <div className={styles.actions}>
        <button type="submit" className={styles.submitBtn} disabled={pending || anyUploading}>
          {pending ? <Loader2 size={16} className={styles.spinner} /> : null}
          Gửi đánh giá
        </button>
        <span className={styles.hint}>Tối đa {MAX_IMAGES} ảnh, mỗi ảnh ≤ 3MB</span>
      </div>
    </form>
  );
}
