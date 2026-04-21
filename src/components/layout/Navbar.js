import Link from 'next/link';
import { ShoppingCart, User, Search } from 'lucide-react';
import styles from './Layout.module.css';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const { cartItems } = useCart();
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoDot}></div>
          <span className={styles.logoText}>VeganGlow</span>
        </Link>
        
        <nav className={styles.nav}>
          <Link href="/products">Sản phẩm</Link>
          <Link href="/about">Về chúng tôi</Link>
          <Link href="/blog">Blog</Link>
        </nav>

        <div className={styles.actions}>
          <button className={styles.iconBtn} aria-label="Search">
            <Search size={20} />
          </button>
          <Link href="/cart" className={styles.iconBtn} aria-label="Cart" style={{ position: 'relative' }}>
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '-8px', 
                right: '-8px', 
                background: 'var(--primary)', 
                color: 'white', 
                fontSize: '0.625rem', 
                fontWeight: '700',
                padding: '2px 5px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center'
              }}>
                {itemCount}
              </span>
            )}
          </Link>
          <Link href="/login" className={styles.iconBtn} aria-label="Login">
            <User size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}
