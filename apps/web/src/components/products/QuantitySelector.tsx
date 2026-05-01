'use client';

import { Minus, Plus } from 'lucide-react';
import styles from './QuantitySelector.module.css';

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
}: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className={styles.wrap} aria-label="Số lượng">
      <button
        type="button"
        className={styles.btn}
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="Giảm số lượng"
      >
        <Minus size={16} />
      </button>
      <input
        type="number"
        className={styles.input}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const raw = Number(e.target.value);
          if (!Number.isFinite(raw)) return;
          const clamped = Math.max(min, Math.min(max, Math.floor(raw)));
          onChange(clamped);
        }}
        disabled={disabled}
        aria-label="Số lượng sản phẩm"
      />
      <button
        type="button"
        className={styles.btn}
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label="Tăng số lượng"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
