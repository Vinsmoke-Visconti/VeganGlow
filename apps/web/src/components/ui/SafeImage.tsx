'use client';

import { useMemo } from 'react';
import type { ImgHTMLAttributes } from 'react';

interface SafeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  /** Fallback URL shown when src is missing or invalid. Pass an empty string to render nothing. */
  fallback: string;
}

// Validates that the URL uses only http/https before rendering, preventing javascript:/data: XSS.
export function SafeImage({ src, fallback, alt, ...props }: SafeImageProps) {
  const safeSrc = useMemo<string>(() => {
    if (!src) return fallback;
    try {
      const url = new URL(src);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback;
      return url.href;
    } catch {
      return fallback;
    }
  }, [src, fallback]);

  if (!safeSrc) return null;
  return <img src={safeSrc} alt={alt} {...props} />;
}
