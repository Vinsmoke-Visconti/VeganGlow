'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PRICE_BRACKETS } from './constants';
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

  // State 2: Text Inputs
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
      setInputMin(initialMin !== undefined && !Number.isNaN(initialMin) ? initialMin.toString() : '');
      setInputMax(initialMax !== undefined && !Number.isNaN(initialMax) ? initialMax.toString() : '');
    }
  }, [initialMin, initialMax, absoluteMin, absoluteMax]);

  const formatCurrency = (val: number) => {
    if (Number.isNaN(val)) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
  };

  // Handlers
  const handleBracketClick = (index: number) => {
    setActiveBracket(index);
    setInputMin('');
    setInputMax('');
    setSliderMin(absoluteMin);
    setSliderMax(absoluteMax);
  };

  const handleInputChange = (type: 'min' | 'max', value: string) => {
    setActiveBracket(null); // Uncheck predefined bracket
    if (type === 'min') {
      setInputMin(value);
      const num = parseInt(value, 10);
      if (!Number.isNaN(num) && num >= absoluteMin && num <= sliderMax) setSliderMin(num);
    } else {
      setInputMax(value);
      const num = parseInt(value, 10);
      if (!Number.isNaN(num) && num <= absoluteMax && num >= sliderMin) setSliderMax(num);
    }
  };

  const handleSliderChange = (type: 'min' | 'max', value: number) => {
    setActiveBracket(null); // Uncheck predefined bracket
    if (type === 'min') {
      const safeVal = Math.min(value, sliderMax);
      setSliderMin(safeVal);
      setInputMin(safeVal.toString());
    } else {
      const safeVal = Math.max(value, sliderMin);
      setSliderMax(safeVal);
      setInputMax(safeVal.toString());
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
      let finalMin = parseInt(inputMin, 10);
      let finalMax = parseInt(inputMax, 10);
      if (Number.isNaN(finalMin)) finalMin = sliderMin;
      if (Number.isNaN(finalMax)) finalMax = sliderMax;

      if (finalMin > absoluteMin) newParams.set('min', finalMin.toString());
      else newParams.delete('min');
      
      if (finalMax < absoluteMax && !Number.isNaN(finalMax)) newParams.set('max', finalMax.toString());
      else newParams.delete('max');
    }

    router.push(`/products?${newParams.toString()}`);
  };

  const range = absoluteMax - absoluteMin;
  const STEP = Math.max(10000, Math.floor(range / 100));
  const minPos = range <= 0 ? 0 : ((sliderMin - absoluteMin) / range) * 100;
  const maxPos = range <= 0 ? 100 : ((sliderMax - absoluteMin) / range) * 100;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Predefined Brackets */}
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Mục mẫu có sẵn</div>
        <div className={styles.priceBrackets}>
          {PRICE_BRACKETS.map((bracket, idx) => (
            <button
              key={idx}
              onClick={() => handleBracketClick(idx)}
              className={`${styles.priceBracket} ${activeBracket === idx ? styles.priceBracketActive : ''}`}
              style={{ width: '100%', textAlign: 'left', marginBottom: '4px' }}
            >
              {bracket.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Number Inputs */}
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tự nhập số tiền</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Tối thiểu"
            value={inputMin}
            onChange={(e) => handleInputChange('min', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          <span className="text-slate-400">-</span>
          <input
            type="number"
            placeholder="Tối đa"
            value={inputMax}
            onChange={(e) => handleInputChange('max', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* 3. Visual Slider */}
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 mt-2">Hoặc kéo thanh trượt</div>
        
        {/* Dynamic Display over slider */}
        <div className="flex justify-between items-center mb-6 px-1 gap-2">
          <div style={{ background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-100)' }} className={`px-2 py-2 rounded-xl border flex-1 text-center min-w-0 transition-opacity ${activeBracket !== null ? 'opacity-30' : 'opacity-100'}`}>
            <span style={{ color: 'var(--color-primary-dark)', opacity: 0.6 }} className="text-[9px] block font-bold uppercase mb-0.5">Tối thiểu</span>
            <span style={{ color: 'var(--color-primary-dark)' }} className="text-[11px] font-black block truncate">{formatCurrency(sliderMin)}</span>
          </div>
          <span style={{ color: 'var(--color-primary-dark)', opacity: 0.3 }} className="text-xs">—</span>
          <div style={{ background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-100)' }} className={`px-2 py-2 rounded-xl border flex-1 text-center min-w-0 transition-opacity ${activeBracket !== null ? 'opacity-30' : 'opacity-100'}`}>
            <span style={{ color: 'var(--color-primary-dark)', opacity: 0.6 }} className="text-[9px] block font-bold uppercase mb-0.5">Tối đa</span>
            <span style={{ color: 'var(--color-primary-dark)' }} className="text-[11px] font-black block truncate">{formatCurrency(sliderMax)}</span>
          </div>
        </div>

        {/* The Slider Track */}
        <div className={`relative h-12 flex items-center mb-2 transition-opacity ${activeBracket !== null ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="absolute w-full h-2 bg-slate-100 rounded-full" />
          <div 
            className="absolute h-2 bg-primary rounded-full z-10" 
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
        
        <div className="flex justify-between mb-4 px-1 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
          <span>{formatCurrency(absoluteMin)}</span>
          <span>{formatCurrency(absoluteMax)}</span>
        </div>
      </div>

      <button onClick={handleApply} className={styles.applyBtn}>
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
        }
        .max-input { z-index: ${sliderMax < absoluteMax / 2 ? 21 : 20}; }
      `}</style>
    </div>
  );
}
