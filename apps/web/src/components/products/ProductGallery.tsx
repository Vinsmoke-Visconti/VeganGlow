'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { normalizeProductImage } from '@/lib/imageUrl';

export type GalleryImage = {
  id?: string;
  url: string;
  alt_text?: string | null;
};

interface ProductGalleryProps {
  images: GalleryImage[];
  fallback?: string | null;
  productName: string;
}

export default function ProductGallery({ images, fallback, productName }: ProductGalleryProps) {
  const list = useMemo<GalleryImage[]>(
    () =>
      images.length > 0
        ? images
        : fallback
          ? [{ url: fallback, alt_text: productName }]
          : [],
    [images, fallback, productName],
  );

  const [active, setActive] = useState(0);

  const mainUrl = list[active]?.url ?? fallback ?? '';
  const mainSrc = normalizeProductImage(mainUrl) ?? mainUrl;

  if (!mainSrc) {
    return (
      <div className="aspect-square w-full rounded-2xl bg-primary-50 grid place-items-center">
        <span className="font-serif text-6xl text-primary">{productName.charAt(0)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      {/* Thumbs */}
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:w-20 lg:overflow-y-auto lg:overflow-x-hidden lg:max-h-[560px]">
          {list.map((img, idx) => {
            const thumbSrc = normalizeProductImage(img.url) ?? img.url;
            const isActive = idx === active;
            return (
              <button
                key={img.id ?? `${img.url}-${idx}`}
                type="button"
                onClick={() => setActive(idx)}
                className={`relative shrink-0 aspect-square w-16 lg:w-full rounded-lg overflow-hidden border-2 transition ${
                  isActive ? 'border-text' : 'border-transparent hover:border-border'
                }`}
                aria-label={`Xem ảnh ${idx + 1}`}
              >
                <Image
                  src={thumbSrc}
                  alt={img.alt_text || `${productName} - ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Main image */}
      <div className="relative flex-1 aspect-square rounded-2xl overflow-hidden bg-primary-50 group">
        <Image
          src={mainSrc}
          alt={list[active]?.alt_text || productName}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority
          unoptimized
        />
      </div>
    </div>
  );
}
