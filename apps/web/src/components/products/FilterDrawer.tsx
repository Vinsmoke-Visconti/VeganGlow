'use client';

import { Filter, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

interface FilterDrawerProps {
  children: ReactNode;
  activeCount?: number;
}

export default function FilterDrawer({ children, activeCount = 0 }: FilterDrawerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center gap-2 h-11 px-4 rounded-full border border-border bg-white text-sm text-text"
      >
        <Filter size={16} />
        Bộ lọc
        {activeCount > 0 && (
          <span className="ml-1 grid place-items-center min-w-5 h-5 px-1.5 rounded-full bg-text text-white text-[11px] font-medium">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-[88vw] max-w-sm bg-bg-card shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Bộ lọc sản phẩm"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
              <span className="font-serif text-lg font-semibold">Bộ lọc</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 grid place-items-center rounded-full hover:bg-primary-50"
                aria-label="Đóng bộ lọc"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
