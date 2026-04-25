import Head from 'next/head';
import styles from '@/styles/Home.module.css';

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>Về chúng tôi | VeganGlow</title>
      </Head>
      <div className={styles.section}>
        <h1>Về chúng tôi</h1>
        <p style={{ marginTop: '2rem', color: 'var(--muted)', lineHeight: '1.8' }}>
          VeganGlow là thương hiệu mỹ phẩm thuần chay tiên phong được thành lập năm 2026. 
          Sứ mệnh của chúng tôi là mang lại vẻ đẹp bền vững và an toàn thông qua các sản phẩm chiết xuất hoàn toàn từ thiên nhiên.
        </p>
      </div>
    </>
  );
}
