import Link from 'next/link';
import styles from './Layout.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <div className={styles.logo} style={{ marginBottom: '1.5rem' }}>
              <div className={styles.logoDot}></div>
              <span className={styles.logoText}>VeganGlow</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Mỹ phẩm thuần chay - Đỉnh cao chăm sóc da từ thiên nhiên. 
              Mang lại vẻ đẹp rạng rỡ và an toàn cho làn da của bạn.
            </p>
          </div>
          
          <div className={styles.footerCol}>
            <h4>Sản phẩm</h4>
            <ul>
              <li><Link href="/products?cat=serum">Serum</Link></li>
              <li><Link href="/products?cat=cleanser">Sữa rửa mặt</Link></li>
              <li><Link href="/products?cat=toner">Toner</Link></li>
              <li><Link href="/products?cat=cream">Kem dưỡng</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4>Công ty</h4>
            <ul>
              <li><Link href="/about">Về chúng tôi</Link></li>
              <li><Link href="/blog">Chuyện làn da</Link></li>
              <li><Link href="/contact">Liên hệ</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4>Liên hệ</h4>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              Email: hello@veganglow.vn<br />
              Hotline: 1900 1234<br />
              Địa chỉ: Quận 1, TP. Hồ Chí Minh
            </p>
          </div>
        </div>
        
        <div className={styles.copyright}>
          &copy; {new Date().getFullYear()} VeganGlow. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
