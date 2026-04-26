import Link from 'next/link';
import styles from './storefront-layout.module.css';

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.wrapper}>
      {/* Premium Glassmorphism Navbar */}
      <header className={styles.header}>
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
            <Link href="/cart" className={styles.iconBtn} aria-label="Giỏ hàng">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </Link>
            <Link href="/login" className={styles.loginBtn}>
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {children}
      </main>

      {/* Modern Footer */}
      <footer className={styles.footer}>
        <div className={`container ${styles.footerContainer}`}>
          <div className={styles.footerBrand}>
            <h3>VeganGlow.</h3>
            <p>Mỹ phẩm thuần chay kết tinh từ thiên nhiên Việt Nam. Sứ mệnh mang lại vẻ đẹp bền vững và an toàn cho làn da của bạn.</p>
          </div>
          <div className={styles.footerLinks}>
            <h4>Sản phẩm</h4>
            <ul>
              <li><Link href="/products?category=serum">Serum</Link></li>
              <li><Link href="/products?category=toner">Toner</Link></li>
              <li><Link href="/products?category=mat-na">Mặt nạ</Link></li>
            </ul>
          </div>
          <div className={styles.footerLinks}>
            <h4>Về chúng tôi</h4>
            <ul>
              <li><Link href="/about">Câu chuyện</Link></li>
              <li><Link href="/contact">Liên hệ</Link></li>
              <li><Link href="/faq">Câu hỏi thường gặp</Link></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} VeganGlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
