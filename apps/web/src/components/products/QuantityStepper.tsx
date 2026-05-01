'use client';

import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  min?: number;
}

export default function QuantityStepper({ value, onChange, max, min = 1 }: QuantityStepperProps) {
  const decDisabled = value <= min;
  const incDisabled = max != null && value >= max;

  const handle = (delta: number) => {
    const next = value + delta;
    if (next < min) return;
    if (max != null && next > max) return;
    onChange(next);
  };

  return (
    <div className="inline-flex items-center h-11 rounded-full border border-border bg-white">
      <button
        type="button"
        onClick={() => handle(-1)}
        disabled={decDisabled}
        className="w-11 h-11 grid place-items-center rounded-l-full text-text disabled:text-text-muted disabled:cursor-not-allowed hover:bg-primary-50"
        aria-label="Giảm số lượng"
      >
        <Minus size={16} />
      </button>
      <span className="min-w-[3rem] text-center font-serif text-base tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => handle(1)}
        disabled={incDisabled}
        className="w-11 h-11 grid place-items-center rounded-r-full text-text disabled:text-text-muted disabled:cursor-not-allowed hover:bg-primary-50"
        aria-label="Tăng số lượng"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
