'use client';

import styles from '@/app/(storefront)/storefront-layout.module.css';
import { useCart } from '@/context/CartContext';
import { createBrowserClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, Search, ShoppingBag, Sparkles, User as UserIcon, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import SearchModal from './SearchModal';

type NavbarProfile = { username: string | null; avatar_url: string | null };

const NAV_LINKS = [
  { href: '/products', label: 'Cửa hàng' },
  { href: '/about', label: 'Câu chuyện' },
  { href: '/blog', label: 'Cẩm nang' },
  { href: '/faq', label: 'Hỗ trợ' },
  { href: '/contact', label: 'Liên hệ' },
];

export default function StorefrontNavbar() {
  const { totalCount, lastAdded } = useCart();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<NavbarProfile | null>(null);
  const [bumpKey, setBumpKey] = useState(0);

  useEffect(() => {
    if (!lastAdded) return;
    setBumpKey((k) => k + 1);
  }, [lastAdded]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const supabase = createBrowserClient();

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();
      setProfile(data);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
        <div className={`container ${styles.headerContainer}`}>
          <div className={styles.logo}>
            <Link href="/" className={styles.logoLink}>
              <Image
                src="/logo.jpg"
                alt="VeganGlow"
                width={40}
                height={40}
                className={styles.logoImg}
                priority
              />
              <span className={styles.logoText}>VeganGlow</span>
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
            <button 
              className={styles.iconBtn} 
              onClick={() => setSearchOpen(true)}
              aria-label="Tìm kiếm"
            >
              <Search size={20} />
            </button>

            <Link href="/wishlist" className={styles.iconBtn} aria-label="Yêu thích">
              <Heart size={20} />
            </Link>

            <Link href="/cart" className={styles.iconBtn} aria-label="Giỏ hàng">
              <motion.span
                key={`cart-icon-${bumpKey}`}
                initial={{ scale: 1 }}
                animate={bumpKey > 0 ? { scale: [1, 1.25, 0.95, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                style={{ display: 'inline-flex' }}
              >
                <ShoppingBag size={20} />
              </motion.span>
              {totalCount > 0 && (
                <motion.span
                  key={`cart-badge-${bumpKey}-${totalCount}`}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className={styles.cartBadge}
                >
                  {totalCount}
                </motion.span>
              )}
            </Link>

            {user ? (
              <Link href="/profile" className={styles.userBtn}>
                <div className={styles.userAvatarMini}>
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username || 'User'}
                      width={32}
                      height={32}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      unoptimized
                    />
                  ) : (
                    <UserIcon size={14} />
                  )}
                </div>
                <span>
                  {profile?.username || 'Tài khoản'}
                </span>
              </Link>
            ) : (
              <Link href="/login" className={styles.loginBtn}>
                <motion.span
                  initial={{ opacity: 0.8 }}
                  whileHover={{ opacity: 1, x: 2 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  Tham gia ngay <Sparkles size={14} />
                </motion.span>
              </Link>
            )}

            <button
              className={styles.navMobileToggle}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className={styles.navDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
          >
            <motion.aside
              className={styles.navDrawerPanel}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <span className={styles.logoText}>VeganGlow</span>
                <button onClick={() => setDrawerOpen(false)} className={styles.iconBtn}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`${styles.navDrawerLink} ${isActive(l.href) ? styles.navDrawerLinkActive : ''}`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--color-border-light)' }}>
                {user ? (
                  <Link href="/profile" className={styles.navDrawerLink}>Hồ sơ cá nhân</Link>
                ) : (
                  <Link href="/login" className={styles.loginBtn} style={{ width: '100%', textAlign: 'center' }}>Đăng nhập</Link>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
