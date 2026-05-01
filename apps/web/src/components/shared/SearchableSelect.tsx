'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Option = {
  label: string;
  value: string;
};

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Chọn một tùy chọn...',
  loading = false,
  disabled = false,
  emptyMessage = 'Không tìm thấy kết quả nào',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => options.find((opt) => opt.value === value), [options, value]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedOption) {
      setInputValue(selectedOption.label);
    } else {
      setInputValue('');
    }
  }, [selectedOption]);

  const filteredOptions = useMemo(() => {
    if (!inputValue || (selectedOption && inputValue === selectedOption.label)) return options;
    const lowerSearch = inputValue.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(lowerSearch));
  }, [options, inputValue, selectedOption]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset input value to selected option label if it was changed but not selected
        setInputValue(selectedOption?.label || '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Clear input on focus if an option is already selected to allow searching
    if (selectedOption) {
      setInputValue('');
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <input
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          style={{
            width: '100%',
            padding: '0.625rem 2.5rem 0.625rem 1rem',
            border: `1px solid ${isOpen ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            backgroundColor: disabled ? 'var(--color-bg-secondary)' : 'white',
            cursor: disabled ? 'not-allowed' : 'text',
            transition: 'all 0.2s ease',
            fontSize: '0.95rem',
            outline: 'none',
            boxShadow: isOpen ? '0 0 0 4px hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.1)' : 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '1rem',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            color: 'var(--color-text-muted)',
          }}
        >
          <ChevronDown
            size={18}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              zIndex: 100,
              overflow: 'hidden',
              maxHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Đang tải...
                </div>
              ) : filteredOptions.length > 0 ? (
                <div>
                  {filteredOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9rem',
                        backgroundColor: value === opt.value ? 'var(--color-primary-50)' : 'transparent',
                        color: value === opt.value ? 'var(--color-primary-dark)' : 'var(--color-text)',
                        fontWeight: value === opt.value ? 600 : 400,
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = value === opt.value ? 'var(--color-primary-50)' : 'transparent')
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  {emptyMessage}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
