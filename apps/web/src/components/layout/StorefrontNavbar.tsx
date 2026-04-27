'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import styles from '@/app/(storefront)/storefront-layout.module.css';
import { ShoppingBag, User, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase/client';

const NAV_LINKS = [
  { href: '/products', label: 'Cửa hàng' },
  { href: '/about', label: 'Về chúng tôi' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Liên hệ' },
];

export default function StorefrontNavbar() {
  const { totalCount } = useCart();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  return (
    <>
      <motion.header
        className={styles.header}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={
          scrolled
            ? { boxShadow: '0 8px 24px rgba(16,185,129,0.08)' }
            : undefined
        }
      >
        <div className={`container ${styles.headerContainer}`}>
          <div className={styles.logo}>
            <Link href="/" className={styles.logoLink}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="VeganGlow Logo" className={styles.logoImg} />
            </Link>
          </div>

          <nav className={styles.nav}>
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${styles.navLink} ${isActive(l.href) ? styles.navLinkActive : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/cart"
                className={styles.iconBtn}
                aria-label="Giỏ hàng"
                style={{ position: 'relative' }}
              >
                <ShoppingBag size={24} />
                <AnimatePresence>
                  {totalCount > 0 && (
                    <motion.span
                      key={totalCount}
                      initial={{ scale: 0, y: -4 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                      style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '10px',
                        minWidth: '18px',
                        textAlign: 'center',
                        boxShadow: '0 4px 8px rgba(16,185,129,0.35)',
                      }}
                    >
                      {totalCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>

            {user ? (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/profile" className={styles.iconBtn} aria-label="Tài khoản">
                    <User size={22} />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <button onClick={handleLogout} className={styles.loginBtn} style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
                    Đăng xuất
                  </button>
                </motion.div>
              </>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/login" className={styles.loginBtn}>
                  Đăng nhập
                </Link>
              </motion.div>
            )}


            <button
              className={styles.navMobileToggle}
              aria-label="Mở menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className={styles.navDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDrawerOpen(false)}
          >
            <motion.aside
              className={styles.navDrawerPanel}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#1a4d2e' }}>VeganGlow</span>
                <button
                  className={styles.iconBtn}
                  aria-label="Đóng"
                  onClick={() => setDrawerOpen(false)}
                  style={{ background: 'transparent', border: 'none' }}
                >
                  <X size={22} />
                </button>
              </div>
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`${styles.navDrawerLink} ${isActive(l.href) ? styles.navDrawerLinkActive : ''}`}
                >
                  {l.label}
                </Link>
              ))}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1rem' }}>
                {user ? (
                  <button onClick={handleLogout} className={styles.navDrawerLink} style={{ textAlign: 'left', background: 'transparent', border: 'none' }}>
                    Đăng xuất
                  </button>
                ) : (
                  <>
                    <Link href="/login" className={styles.navDrawerLink}>Đăng nhập</Link>
                    <Link href="/register" className={styles.navDrawerLink}>Đăng ký</Link>
                  </>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
