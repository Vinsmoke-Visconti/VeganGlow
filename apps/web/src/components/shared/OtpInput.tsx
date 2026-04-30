'use client';

import React, { useRef, useEffect } from 'react';
import styles from './OtpInput.module.css';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of 6 characters
  const otpArray = value.split('').concat(new Array(6 - value.length).fill(''));

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return; // Only numbers

    const newOtp = value.split('');
    // Take only the last character if multiple characters were entered
    newOtp[index] = val.slice(-1);
    const updatedValue = newOtp.join('');
    onChange(updatedValue);

    // Focus next input
    if (val && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;
    onChange(pastedData);
    
    // Focus last input or first empty
    const nextIndex = Math.min(pastedData.length, 5);
    inputs.current[nextIndex]?.focus();
  };

  return (
    <div className={styles.otpContainer}>
      {otpArray.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{1}"
          value={digit}
          onChange={(e) => handleInput(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className={styles.otpBox}
          disabled={disabled}
          maxLength={1}
        />
      ))}
    </div>
  );
}
