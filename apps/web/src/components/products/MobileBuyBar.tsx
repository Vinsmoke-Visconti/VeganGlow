'use client';

import { Check, ShoppingCart } from 'lucide-react';

interface MobileBuyBarProps {
  price: number;
  disabled?: boolean;
  justAdded?: boolean;
  onAddToCart: () => void;
}

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export default function MobileBuyBar({ price, disabled, justAdded, onAddToCart }: MobileBuyBarProps) {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-bg-card/95 backdrop-blur border-t border-border-light px-4 py-3 flex items-center gap-3"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">Giá</span>
        <span className="font-serif text-lg font-semibold text-text">{formatVND(price)}</span>
      </div>
      <button
        type="button"
        onClick={onAddToCart}
        disabled={disabled}
        className="ml-auto h-12 px-6 rounded-full bg-text text-white font-medium inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {justAdded ? (
          <>
            <Check size={18} /> Đã thêm
          </>
        ) : (
          <>
            <ShoppingCart size={18} /> Thêm vào giỏ
          </>
        )}
      </button>
    </div>
  );
}
