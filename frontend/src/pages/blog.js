import Head from 'next/head';
import styles from '@/styles/Home.module.css';

export default function BlogPage() {
  return (
    <>
      <Head>
        <title>Blog | VeganGlow</title>
      </Head>
      <div className={styles.section}>
        <h1>Chuyện làn da</h1>
        <p style={{ marginTop: '2rem', color: 'var(--muted)' }}>
          Nơi chia sẻ các kiến thức chăm sóc da thuần chay và lối sống xanh.
        </p>
      </div>
    </>
  );
}
