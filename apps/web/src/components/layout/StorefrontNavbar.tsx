'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import styles from '@/app/(storefront)/storefront-layout.module.css';
import { ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StorefrontNavbar() {
  const { totalCount } = useCart();

  return (
    <motion.header 
      className={styles.header}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className={`container ${styles.headerContainer}`}>
        <div className={styles.logo}>
          <Link href="/">
            <span className={styles.logoText}>VeganGlow</span>
            <span className={styles.logoDot}>.</span>
          </Link>
        </div>
        
        <nav className={styles.nav}>
          <Link href="/products" className={styles.navLink}>Cửa hàng</Link>
          <Link href="/about" className={styles.navLink}>Câu chuyện</Link>
          <Link href="/blog" className={styles.navLink}>Blog</Link>
        </nav>
        
        <div className={styles.actions}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/cart" className={styles.iconBtn} aria-label="Giỏ hàng" style={{ position: 'relative' }}>
              <ShoppingBag size={24} />
              {totalCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  style={{ 
                    position: 'absolute', 
                    top: '-5px', 
                    right: '-5px', 
                    background: '#10b981', 
                    color: 'white', 
                    fontSize: '0.7rem', 
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    minWidth: '18px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  {totalCount}
                </motion.span>
              )}
            </Link>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/login" className={styles.loginBtn}>
              <User size={18} className="mr-2 inline" /> Đăng nhập
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
