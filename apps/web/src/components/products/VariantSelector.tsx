'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './VariantSelector.module.css';

export type Variant = {
  id: string;
  sku: string | null;
  name: string | null;
  attributes: Record<string, string | number | boolean | null> | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  image_url: string | null;
  position: number;
  is_active: boolean;
};

interface VariantSelectorProps {
  variants: Variant[];
  onVariantChange: (v: Variant | null) => void;
}

export default function VariantSelector({ variants, onVariantChange }: VariantSelectorProps) {
  const activeVariants = useMemo(
    () => variants.filter((v) => v.is_active).sort((a, b) => a.position - b.position),
    [variants],
  );

  // Group attribute keys → unique values, preserving first-seen order
  const groups = useMemo(() => {
    const out: Record<string, string[]> = {};
    activeVariants.forEach((v) => {
      const attrs = v.attributes ?? {};
      Object.entries(attrs).forEach(([k, val]) => {
        if (val == null) return;
        const str = String(val);
        if (!out[k]) out[k] = [];
        if (!out[k].includes(str)) out[k].push(str);
      });
    });
    return out;
  }, [activeVariants]);

  const groupKeys = Object.keys(groups);

  // Default selected: first variant's attributes
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const first = activeVariants[0];
    if (!first?.attributes) return {};
    const init: Record<string, string> = {};
    Object.entries(first.attributes).forEach(([k, v]) => {
      if (v != null) init[k] = String(v);
    });
    return init;
  });

  // Find matching variant given current selection
  const matched = useMemo(() => {
    if (groupKeys.length === 0) return null;
    return (
      activeVariants.find((v) => {
        const attrs = v.attributes ?? {};
        return groupKeys.every((k) => String(attrs[k] ?? '') === selected[k]);
      }) ?? null
    );
  }, [activeVariants, groupKeys, selected]);

  useEffect(() => {
    onVariantChange(matched);
  }, [matched, onVariantChange]);

  // Stock for a specific (key, value) combo, considering other selected attributes
  const stockFor = (key: string, value: string): number => {
    const candidate = activeVariants.find((v) => {
      const attrs = v.attributes ?? {};
      if (String(attrs[key] ?? '') !== value) return false;
      return groupKeys.every((k) => {
        if (k === key) return true;
        if (!selected[k]) return true;
        return String(attrs[k] ?? '') === selected[k];
      });
    });
    return candidate?.stock ?? 0;
  };

  if (activeVariants.length === 0 || groupKeys.length === 0) return null;

  return (
    <div className={styles.wrap}>
      {groupKeys.map((key) => (
        <div key={key} className={styles.group}>
          <div className={styles.label}>
            <span className={styles.labelText}>{key}</span>
            {selected[key] && <span className={styles.labelValue}>: {selected[key]}</span>}
          </div>
          <div className={styles.options}>
            {groups[key].map((value) => {
              const isSelected = selected[key] === value;
              const stock = stockFor(key, value);
              const outOfStock = stock <= 0;
              const lowStock = stock > 0 && stock < 5;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => !outOfStock && setSelected((prev) => ({ ...prev, [key]: value }))}
                  disabled={outOfStock}
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''} ${outOfStock ? styles.optionOut : ''}`}
                  aria-pressed={isSelected}
                >
                  <span className={styles.optionValue}>{value}</span>
                  {outOfStock && <span className={styles.optionStatus}>Hết hàng</span>}
                  {lowStock && <span className={styles.optionStatusLow}>Còn {stock}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
