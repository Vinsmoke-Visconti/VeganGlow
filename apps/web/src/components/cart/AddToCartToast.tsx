'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import styles from './AddToCartToast.module.css';

export default function AddToCartToast() {
  const { lastAdded } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastAdded) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 3500);
    return () => window.clearTimeout(timer);
  }, [lastAdded]);

  return (
    <div className={styles.host} aria-live="polite" aria-atomic>
      <AnimatePresence>
        {visible && lastAdded && (
          <motion.div
            key={lastAdded.at}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={styles.toast}
            role="status"
          >
            <div className={styles.iconWrap}>
              <CheckCircle2 size={22} />
            </div>
            {lastAdded.image ? (
              <div className={styles.thumb}>
                <Image
                  src={lastAdded.image}
                  alt={lastAdded.name}
                  width={48}
                  height={48}
                  unoptimized
                />
              </div>
            ) : null}
            <div className={styles.body}>
              <span className={styles.title}>Đã thêm vào giỏ hàng</span>
              <span className={styles.name}>{lastAdded.name}</span>
            </div>
            <Link href="/cart" className={styles.cta} onClick={() => setVisible(false)}>
              <ShoppingBag size={16} /> Xem giỏ
            </Link>
            <button
              type="button"
              aria-label="Đóng thông báo"
              className={styles.close}
              onClick={() => setVisible(false)}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
