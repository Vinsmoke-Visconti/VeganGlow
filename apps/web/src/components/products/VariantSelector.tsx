'use client';

import { useEffect, useMemo, useState } from 'react';

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

  // Determine if a (key, value) combo has any in-stock active variant
  const isValueAvailable = (key: string, value: string): boolean => {
    return activeVariants.some((v) => {
      const attrs = v.attributes ?? {};
      if (String(attrs[key] ?? '') !== value) return false;
      // Match other selected attributes (where set), excluding current key
      const compatible = groupKeys.every((k) => {
        if (k === key) return true;
        if (!selected[k]) return true;
        return String(attrs[k] ?? '') === selected[k];
      });
      return compatible && v.stock > 0;
    });
  };

  if (activeVariants.length === 0 || groupKeys.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {groupKeys.map((key) => (
        <div key={key} className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">{key}</span>
          <div className="flex flex-wrap gap-2">
            {groups[key].map((value) => {
              const isSelected = selected[key] === value;
              const available = isValueAvailable(key, value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelected((prev) => ({ ...prev, [key]: value }))}
                  disabled={!available}
                  className={[
                    'inline-flex items-center px-4 h-10 rounded-full text-sm transition border',
                    isSelected
                      ? 'border-text bg-text text-white'
                      : available
                        ? 'border-border bg-white text-text hover:border-text'
                        : 'border-border-light text-text-muted line-through cursor-not-allowed opacity-50',
                  ].join(' ')}
                  aria-pressed={isSelected}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
