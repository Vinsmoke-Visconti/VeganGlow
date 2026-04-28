import Link from 'next/link';
import styles from './storefront-layout.module.css';
import StorefrontNavbar from '@/components/layout/StorefrontNavbar';
import PageTransition from '@/components/ui/PageTransition';
import { ScrollProgress } from '@/components/ui/ScrollProgress';
import { ScrollToTop } from '@/components/ui/ScrollToTop';

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.wrapper}>
      <ScrollProgress />
      <StorefrontNavbar />

      {/* Main Content */}
      <main className={styles.main}>
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Premium Botanical Footer */}
      <footer className={styles.footer}>
        <div className={`container ${styles.footerContainer}`}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <img src="/logo.png" alt="VeganGlow" style={{ height: 40 }} />
              <span className={styles.logoText} style={{ color: 'white' }}>VeganGlow</span>
            </div>
            <p className={styles.footerTagline}>
              Kết tinh từ thiên nhiên Việt Nam, mang lại vẻ đẹp thuần khiết và bền vững cho làn da của bạn.
            </p>
            <div className={styles.footerSocials}>
              <a href="#" className={styles.socialLink} aria-label="Facebook">FB</a>
              <a href="#" className={styles.socialLink} aria-label="Instagram">IG</a>
              <a href="#" className={styles.socialLink} aria-label="Youtube">YT</a>
            </div>
          </div>

          <div className={styles.footerLinks}>
            <h4>Sản phẩm</h4>
            <ul>
              <li><Link href="/products">Tất cả sản phẩm</Link></li>
              <li><Link href="/products?category=serum">Serum tinh chất</Link></li>
              <li><Link href="/products?category=toner">Toner dịu nhẹ</Link></li>
              <li><Link href="/products?category=mat-na">Mặt nạ thiên nhiên</Link></li>
            </ul>
          </div>

          <div className={styles.footerLinks}>
            <h4>Hành trình</h4>
            <ul>
              <li><Link href="/about">Câu chuyện thương hiệu</Link></li>
              <li><Link href="/blog">Cẩm nang làm đẹp</Link></li>
              <li><Link href="/contact">Liên hệ chúng tôi</Link></li>
              <li><Link href="/faq">Trung tâm hỗ trợ</Link></li>
            </ul>
          </div>

          <div className={styles.footerNewsletter}>
            <h4>Bản tin VeganGlow</h4>
            <p>Đăng ký để nhận ưu đãi đặc biệt và bí quyết làm đẹp thuần chay.</p>
            <div className={styles.newsletterForm}>
              <input type="email" placeholder="Email của bạn..." className={styles.newsletterInput} />
              <button className={styles.newsletterBtn}>Gửi</button>
            </div>
          </div>
        </div>
        
        <div className={styles.footerBottom}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <p>&copy; {new Date().getFullYear()} VeganGlow — Mỹ phẩm thuần chay Việt Nam.</p>
            <div className={styles.footerLegal}>
              <Link href="/privacy">Chính sách bảo mật</Link>
              <Link href="/terms">Điều khoản sử dụng</Link>
            </div>
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
