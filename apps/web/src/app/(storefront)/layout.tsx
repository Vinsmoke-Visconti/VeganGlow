import Link from 'next/link';
import styles from './storefront-layout.module.css';
import { CartProvider } from '@/context/CartContext';
import StorefrontNavbar from '@/components/layout/StorefrontNavbar';

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className={styles.wrapper}>
        <StorefrontNavbar />

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
    </CartProvider>
  );
}
