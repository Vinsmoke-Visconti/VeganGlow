'use client';

import { Share2 } from 'lucide-react';

export default function BlogShareButton({ title }: { title: string }) {
  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const navWithShare = navigator as Navigator & {
      share?: (data: { title: string; url: string }) => Promise<void>;
    };
    navWithShare.share?.({ title, url }).catch(() => {});
  };

  return (
    <button
      onClick={handleShare}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0.6rem 1.2rem',
        background: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      <Share2 size={16} /> Chia sẻ
    </button>
  );
}
