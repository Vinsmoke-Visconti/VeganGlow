'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PRICE_BRACKETS } from './constants';
import styles from './products.module.css';

interface PriceFilterProps {
  initialMin?: number;
  initialMax?: number;
  absoluteMin: number;
  absoluteMax: number;
  bracketCounts?: number[];
}

export default function PriceFilter({
  initialMin,
  initialMax,
  absoluteMin,
  absoluteMax,
  bracketCounts,
}: PriceFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper: Format number with dots as thousands separators
  const formatWithDots = (val: number | string) => {
    if (val === '') return '';
    const num = typeof val === 'string' ? parseInt(val.replace(/\./g, ''), 10) : val;
    if (Number.isNaN(num)) return '';
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  // Helper: Parse string with dots back to number
  const parseFromDots = (str: string) => {
    const raw = str.replace(/\./g, '');
    const num = parseInt(raw, 10);
    return Number.isNaN(num) ? 0 : num;
  };

  const formatCurrency = (val: number) => {
    if (Number.isNaN(val)) return '0đ';
    return formatWithDots(val) + 'đ';
  };

  // Safely clamp bounds for the slider
  const getSafeBounds = (inMin: number | undefined, inMax: number | undefined, absMin: number, absMax: number) => {
    let sMin = inMin === undefined || Number.isNaN(inMin) ? absMin : inMin;
    let sMax = inMax === undefined || Number.isNaN(inMax) ? absMax : inMax;
    sMin = Math.max(absMin, Math.min(sMin, absMax));
    sMax = Math.max(absMin, Math.min(sMax, absMax));
    if (sMin > sMax) sMin = sMax;
    return { sMin, sMax };
  };

  // State 1: Predefined Brackets
  const [activeBracket, setActiveBracket] = useState<number | null>(null);

  // State 2: Text Inputs (formatted with dots)
  const [inputMin, setInputMin] = useState('');
  const [inputMax, setInputMax] = useState('');

  // State 3: Slider
  const [sliderMin, setSliderMin] = useState(absoluteMin);
  const [sliderMax, setSliderMax] = useState(absoluteMax);

  // Hydrate initial state
  useEffect(() => {
    const matchedBracketIdx = PRICE_BRACKETS.findIndex(b => 
      b.min === initialMin && (b.max === initialMax || (b.max === Infinity && (initialMax === undefined || Number.isNaN(initialMax))))
    );

    if (matchedBracketIdx >= 0) {
      setActiveBracket(matchedBracketIdx);
      setInputMin('');
      setInputMax('');
      setSliderMin(absoluteMin);
      setSliderMax(absoluteMax);
    } else {
      setActiveBracket(null);
      const { sMin, sMax } = getSafeBounds(initialMin, initialMax, absoluteMin, absoluteMax);
      setSliderMin(sMin);
      setSliderMax(sMax);
      setInputMin(initialMin !== undefined && !Number.isNaN(initialMin) ? formatWithDots(initialMin) : '');
      setInputMax(initialMax !== undefined && !Number.isNaN(initialMax) ? formatWithDots(initialMax) : '');
    }
  }, [initialMin, initialMax, absoluteMin, absoluteMax]);

  // Handlers
  const handleBracketClick = (index: number) => {
    const isDeselecting = activeBracket === index;
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete('page');

    if (isDeselecting) {
      setActiveBracket(null);
      newParams.delete('min');
      newParams.delete('max');
    } else {
      setActiveBracket(index);
      setInputMin('');
      setInputMax('');
      setSliderMin(absoluteMin);
      setSliderMax(absoluteMax);

      const b = PRICE_BRACKETS[index];
      newParams.set('min', b.min.toString());
      if (b.max !== Infinity) newParams.set('max', b.max.toString());
      else newParams.delete('max');
    }

    router.push(`/products?${newParams.toString()}`);
  };

  const handleInputChange = (type: 'min' | 'max', value: string) => {
    setActiveBracket(null);
    const cleanValue = value.replace(/[^\d]/g, '');
    const formatted = formatWithDots(cleanValue);
    const num = parseFromDots(formatted);
    const minGap = (absoluteMax - absoluteMin) / 10;

    if (type === 'min') {
      setInputMin(formatted);
      if (num >= absoluteMin && num <= absoluteMax) {
        setSliderMin(num);
        // If min > max - gap, push max forward
        if (num > sliderMax - minGap) {
          const newMax = Math.min(absoluteMax, num + minGap);
          setSliderMax(newMax);
          setInputMax(formatWithDots(newMax));
        }
      }
    } else {
      setInputMax(formatted);
      if (num <= absoluteMax && num >= absoluteMin) {
        setSliderMax(num);
        // If max < min + gap, push min backward
        if (num < sliderMin + minGap) {
          const newMin = Math.max(absoluteMin, num - minGap);
          setSliderMin(newMin);
          setInputMin(formatWithDots(newMin));
        }
      }
    }
  };

  const handleSliderChange = (type: 'min' | 'max', value: number) => {
    setActiveBracket(null);
    const minGap = (absoluteMax - absoluteMin) / 10;
    
    if (type === 'min') {
      const safeVal = Math.min(value, sliderMax - minGap);
      setSliderMin(safeVal);
      setInputMin(formatWithDots(safeVal));
    } else {
      const safeVal = Math.max(value, sliderMin + minGap);
      setSliderMax(safeVal);
      setInputMax(formatWithDots(safeVal));
    }
  };

  const handleApply = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete('page');

    if (activeBracket !== null) {
      const b = PRICE_BRACKETS[activeBracket];
      newParams.set('min', b.min.toString());
      if (b.max !== Infinity) newParams.set('max', b.max.toString());
      else newParams.delete('max');
    } else {
      let finalMin = parseFromDots(inputMin);
      let finalMax = parseFromDots(inputMax);
      if (Number.isNaN(finalMin) || inputMin === '') finalMin = sliderMin;
      if (Number.isNaN(finalMax) || inputMax === '') finalMax = sliderMax;

      if (finalMin > absoluteMin) newParams.set('min', finalMin.toString());
      else newParams.delete('min');
      
      if (finalMax < absoluteMax && finalMax > 0) newParams.set('max', finalMax.toString());
      else newParams.delete('max');
    }

    router.push(`/products?${newParams.toString()}`);
  };

  const range = absoluteMax - absoluteMin;
  const STEP = Math.max(10000, Math.floor(range / 100));
  const minPos = range <= 0 ? 0 : ((sliderMin - absoluteMin) / range) * 100;
  const maxPos = range <= 0 ? 100 : ((sliderMax - absoluteMin) / range) * 100;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Category-style Brackets */}
      <div className="flex flex-col gap-1">
        {PRICE_BRACKETS.map((b, idx) => (
          <button
            key={idx}
            onClick={() => handleBracketClick(idx)}
            className={`${styles.categoryItem} ${activeBracket === idx ? styles.categoryItemActive : ''}`}
            style={{ width: '100%', border: 'none', background: activeBracket === idx ? undefined : 'transparent', textAlign: 'left' }}
          >
            <span>{b.label}</span>
          </button>
        ))}
      </div>

      {/* 2. Min-Max Inputs Row - Stacked for Full Visibility */}
      <div className="flex flex-col gap-3 mt-4">
        <div className="relative">
          <label className="text-xs font-black uppercase tracking-widest text-primary-dark ml-4 mb-2 block">Từ</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={inputMin}
              onChange={(e) => handleInputChange('min', e.target.value)}
              className="w-full px-5 py-4 bg-white/60 border-2 border-white/80 rounded-2xl text-lg font-black text-primary-dark outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-primary-dark/40 pointer-events-none">VNĐ</span>
          </div>
        </div>

        <div className="relative">
          <label className="text-xs font-black uppercase tracking-widest text-primary-dark ml-4 mb-2 block">Đến</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={inputMax}
              onChange={(e) => handleInputChange('max', e.target.value)}
              className="w-full px-5 py-4 bg-white/60 border-2 border-white/80 rounded-2xl text-lg font-black text-primary-dark outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-primary-dark/40 pointer-events-none">VNĐ</span>
          </div>
        </div>
      </div>

      {/* 3. Visual Slider */}
      <div className="pt-2 px-1">
        <div className={`relative h-8 flex items-center transition-all ${activeBracket !== null ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="absolute w-full h-[2px] bg-white/20 rounded-full" />
          <div 
            className="absolute h-[3px] bg-primary rounded-full z-10" 
            style={{ left: `${minPos}%`, width: `${maxPos - minPos}%` }} 
          />
          
          <input
            type="range"
            min={absoluteMin}
            max={absoluteMax}
            step={STEP}
            value={sliderMin}
            onChange={(e) => handleSliderChange('min', Number(e.target.value))}
            className="dual-range-input min-input"
          />
          <input
            type="range"
            min={absoluteMin}
            max={absoluteMax}
            step={STEP}
            value={sliderMax}
            onChange={(e) => handleSliderChange('max', Number(e.target.value))}
            className="dual-range-input max-input"
          />
          
          <div className="thumb-visual" style={{ left: `${minPos}%` }} />
          <div className="thumb-visual" style={{ left: `${maxPos}%` }} />
        </div>
      </div>

      <button 
        onClick={handleApply} 
        className={styles.applyBtn}
        style={{ marginTop: '0.5rem' }}
      >
        Áp dụng bộ lọc
      </button>

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
        .dual-range-input::-webkit-slider-thumb {
          appearance: none;
          pointer-events: auto;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          background: transparent;
        }
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
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          pointer-events: none;
        }
        .dual-range-input:hover ~ .thumb-visual {
          transform: translate(-50%, -50%) scale(1.3);
          border-width: 5px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .max-input { z-index: ${sliderMax < absoluteMax / 2 ? 21 : 20}; }
      `}</style>
    </div>
  );
}
