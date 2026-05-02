import AddToCartToast from '@/components/cart/AddToCartToast';
import NewsletterForm from '@/components/layout/NewsletterForm';
import StorefrontNavbar from '@/components/layout/StorefrontNavbar';
import PageTransition from '@/components/ui/PageTransition';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './storefront-layout.module.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | VeganGlow',
    default: 'VeganGlow - Mỹ phẩm Thuần Chay',
  },
};

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.wrapper}>
      <StorefrontNavbar />
      <AddToCartToast />

      <main className={styles.main}>
        <PageTransition>{children}</PageTransition>
      </main>

      <footer className={styles.footer}>
        <div className={`container ${styles.footerContainer}`}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <Image src="/logo.jpg" alt="VeganGlow" width={40} height={40} className={styles.footerLogoImage} />
              <span className={styles.footerLogoText}>VeganGlow</span>
            </div>
            <p className={styles.footerTagline}>
              Kết tinh từ thiên nhiên Việt Nam, mang lại vẻ đẹp thuần khiết và bền vững cho làn da của bạn.
            </p>
            <div className={styles.footerSocials}>
              <a href="#" className={styles.socialLink} aria-label="Facebook">
                <Facebook size={18} />
              </a>
              <a href="#" className={styles.socialLink} aria-label="Instagram">
                <Instagram size={18} />
              </a>
              <a href="#" className={styles.socialLink} aria-label="Youtube">
                <Youtube size={18} />
              </a>
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
            <NewsletterForm />
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div className={`container ${styles.footerBottomInner}`}>
            <p>&copy; {new Date().getFullYear()} VeganGlow - Mỹ phẩm thuần chay Việt Nam.</p>
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
