'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SORT_OPTIONS } from '@/app/(storefront)/products/constants';
import styles from '@/app/(storefront)/products/products.module.css';
import { ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SortSelect Component
 * Modern Glassmorphism implementation for sorting products.
 */
export default function SortSelect({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSort = SORT_OPTIONS.find(opt => opt.value === defaultValue) || SORT_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'newest') {
      params.set('sort', value);
    } else {
      params.delete('sort');
    }
    router.push(`/products?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <div className={styles.sortContainer} ref={containerRef}>
      <button 
        type="button"
        className={styles.sortTrigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.sortLabel}>Sắp xếp:</span>
        <span className={styles.sortValue}>{currentSort.label}</span>
        <ChevronDown 
          size={16} 
          className={`${styles.sortChevron} ${isOpen ? styles.sortChevronOpen : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul 
            className={styles.sortDropdown}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="listbox"
          >
            {SORT_OPTIONS.map((opt) => (
              <li 
                key={opt.value}
                role="option"
                aria-selected={opt.value === defaultValue}
                className={`${styles.sortOption} ${opt.value === defaultValue ? styles.sortOptionActive : ''}`}
                onClick={() => handleSortChange(opt.value)}
              >
                <span>Sắp xếp: {opt.label}</span>
                {opt.value === defaultValue && <Check size={14} className={styles.checkIcon} />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
