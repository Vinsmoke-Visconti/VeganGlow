'use client';

import { useState, useCallback, DragEvent } from 'react';
import Image from 'next/image';
import { Trash2, Star, Loader2, UploadCloud } from 'lucide-react';

export type ProductImageRow = {
  id: string;
  url: string;
  alt_text: string | null;
  position: number;
  is_thumbnail: boolean;
  width: number | null;
  height: number | null;
};

type Props = {
  productId: string;
  initialImages: ProductImageRow[];
  onAdd: (img: { url: string; width: number; height: number; isThumbnail: boolean; position: number }) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onSetThumbnail: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

export function MediaUploader({ initialImages, onAdd, onDelete, onSetThumbnail }: Props) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setUploading(true);
      try {
        const fileArr = Array.from(files);
        for (const file of fileArr) {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd });
          if (!res.ok) {
            const j = await res.json().catch(() => ({ error: 'Upload failed' }));
            setError(j.error ?? 'Upload failed');
            continue;
          }
          const { url, width, height } = await res.json();
          const isThumbnail = images.length === 0; // first image becomes thumbnail
          const result = await onAdd({
            url,
            width,
            height,
            isThumbnail,
            position: images.length,
          });
          if (!result.ok) {
            setError(result.error ?? 'Save failed');
            continue;
          }
          // Optimistic update — refresh from server happens via revalidatePath
          setImages((prev) => [
            ...prev,
            {
              id: 'temp-' + Date.now(),
              url,
              alt_text: null,
              position: prev.length,
              is_thumbnail: isThumbnail,
              width,
              height,
            },
          ]);
        }
      } finally {
        setUploading(false);
      }
    },
    [images.length, onAdd]
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) upload(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? '#1a7f37' : '#bbb'}`,
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          background: dragOver ? '#f0f9f3' : '#fafafa',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onClick={() => document.getElementById('media-file-input')?.click()}
      >
        {uploading ? (
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <UploadCloud size={32} />
        )}
        <p style={{ marginTop: 8, fontSize: 14 }}>
          {uploading ? 'Đang tải lên & chuyển WebP…' : 'Kéo thả ảnh vào đây hoặc bấm để chọn'}
        </p>
        <p style={{ fontSize: 12, color: '#666' }}>
          Hỗ trợ: JPG / PNG / WebP / GIF. Tối đa 5MB. Tự động chuyển WebP, resize ≤1600px.
        </p>
        <input
          id="media-file-input"
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <p style={{ color: '#c0392b', marginTop: 8, fontSize: 13 }}>{error}</p>
      )}

      {images.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
            marginTop: 16,
          }}
        >
          {images.map((img) => (
            <div
              key={img.id}
              style={{
                position: 'relative',
                border: img.is_thumbnail ? '2px solid #1a7f37' : '1px solid #ddd',
                borderRadius: 8,
                overflow: 'hidden',
                aspectRatio: '1',
                background: '#f5f5f5',
              }}
            >
              <Image src={img.url} alt={img.alt_text ?? ''} fill style={{ objectFit: 'cover' }} sizes="140px" unoptimized />
              <div
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  display: 'flex',
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  title={img.is_thumbnail ? 'Đang là ảnh chính' : 'Đặt làm ảnh chính'}
                  onClick={() => onSetThumbnail(img.id)}
                  style={{
                    padding: 4,
                    background: img.is_thumbnail ? '#1a7f37' : 'rgba(255,255,255,0.9)',
                    color: img.is_thumbnail ? '#fff' : '#333',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  <Star size={14} />
                </button>
                <button
                  type="button"
                  title="Xoá"
                  onClick={async () => {
                    if (!confirm('Xoá ảnh này?')) return;
                    const r = await onDelete(img.id);
                    if (r.ok) setImages((prev) => prev.filter((p) => p.id !== img.id));
                    else setError(r.error ?? 'Delete failed');
                  }}
                  style={{
                    padding: 4,
                    background: 'rgba(220,53,69,0.9)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {img.is_thumbnail && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '2px 6px',
                    background: '#1a7f37',
                    color: '#fff',
                    fontSize: 11,
                    textAlign: 'center',
                  }}
                >
                  Ảnh chính
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
