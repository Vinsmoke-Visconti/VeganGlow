import React from 'react';
import styles from './Layout.module.css';

interface FooterProps {
  LinkComponent?: React.ElementType;
}

export default function Footer({ LinkComponent = 'a' }: FooterProps) {
  const Link = LinkComponent;

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerInfo}>
            <Link href="/" className={styles.logo}>
              <div className={styles.logoDot}></div>
              <span className={styles.logoText}>VeganGlow</span>
            </Link>
            <p>Mỹ phẩm thuần chay — Cho vẻ đẹp bền vững.</p>
          </div>
          
          <div className={styles.footerLinks}>
            <h4>Sản phẩm</h4>
            <ul>
              <li><Link href="/products?category=skincare">Chăm sóc da</Link></li>
              <li><Link href="/products?category=haircare">Chăm sóc tóc</Link></li>
              <li><Link href="/products?category=bodycare">Chăm sóc cơ thể</Link></li>
            </ul>
          </div>

          <div className={styles.footerLinks}>
            <h4>Hỗ trợ</h4>
            <ul>
              <li><Link href="/about">Về chúng tôi</Link></li>
              <li><Link href="/contact">Liên hệ</Link></li>
              <li><Link href="/faq">Câu hỏi thường gặp</Link></li>
            </ul>
          </div>
        </div>
        
        <div className={styles.copyright}>
          <p>&copy; {new Date().getFullYear()} VeganGlow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
