'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './products.module.css';

interface PriceFilterProps {
  initialMin?: number;
  initialMax?: number;
  absoluteMin: number;
  absoluteMax: number;
}

export default function PriceFilter({ initialMin, initialMax, absoluteMin, absoluteMax }: PriceFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [min, setMin] = useState(() => {
    const val = initialMin ?? absoluteMin;
    return Number.isNaN(val) ? absoluteMin : Math.max(val, absoluteMin);
  });
  const [max, setMax] = useState(() => {
    const val = initialMax ?? absoluteMax;
    return Number.isNaN(val) ? absoluteMax : Math.min(val, absoluteMax);
  });

  useEffect(() => {
    setMin(initialMin ?? absoluteMin);
    setMax(initialMax ?? absoluteMax);
  }, [initialMin, initialMax, absoluteMin, absoluteMax]);

  const formatCurrency = (val: number) => {
    if (Number.isNaN(val)) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
  };

  const handleApply = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (min > absoluteMin) newParams.set('min', min.toString());
    else newParams.delete('min');
    
    if (max < absoluteMax) newParams.set('max', max.toString());
    else newParams.delete('max');
    
    newParams.delete('page');
    router.push(`/products?${newParams.toString()}`);
  };

  const range = absoluteMax - absoluteMin;
  // Step: divide into ~100 steps, but at least 10,000đ
  const STEP = Math.max(10000, Math.floor(range / 100));

  const minPos = range <= 0 ? 0 : ((min - absoluteMin) / range) * 100;
  const maxPos = range <= 0 ? 100 : ((max - absoluteMin) / range) * 100;

  return (
    <div className={styles.filterGroup}>
      <div className={styles.filterLabel}>Khoảng giá</div>
      
      {/* Price Display */}
      <div className="flex justify-between items-center mb-6 px-1 gap-2">
        <div style={{ background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-100)' }} className="px-2 py-2 rounded-xl border flex-1 text-center min-w-0">
          <span style={{ color: 'var(--color-primary-dark)', opacity: 0.6 }} className="text-[9px] block font-bold uppercase mb-0.5">Tối thiểu</span>
          <span style={{ color: 'var(--color-primary-dark)' }} className="text-[11px] font-black block truncate">{formatCurrency(min)}</span>
        </div>
        <span style={{ color: 'var(--color-primary-dark)', opacity: 0.3 }} className="text-xs">—</span>
        <div style={{ background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-100)' }} className="px-2 py-2 rounded-xl border flex-1 text-center min-w-0">
          <span style={{ color: 'var(--color-primary-dark)', opacity: 0.6 }} className="text-[9px] block font-bold uppercase mb-0.5">Tối đa</span>
          <span style={{ color: 'var(--color-primary-dark)' }} className="text-[11px] font-black block truncate">{formatCurrency(max)}</span>
        </div>
      </div>

      <div className="relative h-12 flex items-center mb-4">
        <div className="absolute w-full h-2 bg-slate-100 rounded-full" />
        <div 
          className="absolute h-2 bg-primary rounded-full z-10" 
          style={{ 
            left: `${minPos}%`, 
            width: `${maxPos - minPos}%` 
          }} 
        />
        
        <input
          type="range"
          min={absoluteMin}
          max={absoluteMax}
          step={STEP}
          value={min}
          onChange={(e) => setMin(Math.min(Number(e.target.value), max - STEP))}
          className="dual-range-input min-input"
        />
        <input
          type="range"
          min={absoluteMin}
          max={absoluteMax}
          step={STEP}
          value={max}
          onChange={(e) => setMax(Math.max(Number(e.target.value), min + STEP))}
          className="dual-range-input max-input"
        />
        
        <div className="thumb-visual" style={{ left: `${minPos}%` }} />
        <div className="thumb-visual" style={{ left: `${maxPos}%` }} />
      </div>

      <button onClick={handleApply} className={styles.applyBtn}>
        Áp dụng bộ lọc
      </button>
      
      <div className="flex justify-between mt-[-8px] mb-4 px-1 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
        <span>{formatCurrency(absoluteMin)}</span>
        <span>{formatCurrency(absoluteMax)}</span>
      </div>

      <style jsx>{`
        .dual-range-input {
          position: absolute;
          width: 100%;
          background: none;
          pointer-events: none;
          appearance: none;
          z-index: 20;
          height: 10px;
          margin: 0;
          padding: 0;
        }
        
        /* Webkit Thumbs */
        .dual-range-input::-webkit-slider-thumb {
          appearance: none;
          pointer-events: auto;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          background: transparent;
        }

        /* Firefox Thumbs */
        .dual-range-input::-moz-range-thumb {
          appearance: none;
          pointer-events: auto;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          background: transparent;
          border: none;
        }

        .thumb-visual {
          position: absolute;
          width: 20px;
          height: 20px;
          background: white;
          border: 4px solid var(--color-primary);
          border-radius: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 15;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          pointer-events: none;
          transition: transform 0.1s ease;
        }

        .min-input { z-index: ${min > absoluteMax / 2 ? 21 : 20}; }
        .max-input { z-index: ${max < absoluteMax / 2 ? 21 : 20}; }
      `}</style>
    </div>
  );
}
