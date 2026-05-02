'use client';
 
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import styles from '../backoffice-layout.module.css';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={styles.themeTogglePlaceholder} />;
  }

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      className={`${styles.themeToggle} ${isDark ? styles.themeToggleDark : ''}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Chuyển đổi giao diện"
      title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    >
      <div className={styles.themeToggleIconWrapper}>
        <Sun className={styles.sunIcon} size={16} />
        <Moon className={styles.moonIcon} size={16} />
      </div>
      <div className={styles.themeToggleTrack}>
        <div className={styles.themeToggleThumb} />
      </div>
    </button>
  );
}
