import styles from '@/styles/Home.module.css';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    alert('Hệ thống đăng nhập cũ đã bị vô hiệu hóa vì lý do bảo mật. Vui lòng sử dụng trang đăng nhập chính thức của VeganGlow.');
  };

  return (
    <>
      <Head>
        <title>Đăng nhập | VeganGlow</title>
      </Head>

      <div className={styles.section} style={{ maxWidth: '400px', margin: '4rem auto' }}>
        <div className="card" style={{ padding: '2.5rem' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem' }}>Đăng nhập</h1>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Email hoặc Tên đăng nhập</label>
              <input
                type="text"
                placeholder="admin"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Mật khẩu</label>
              <input
                type="password"
                placeholder="admin"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', marginTop: '1rem' }}>
              Đăng nhập
            </button>
          </form>

          <p style={{ marginTop: '2rem', fontSize: '0.875rem', textAlign: 'center', color: 'var(--muted)' }}>
            Chưa có tài khoản? <Link href="#" style={{ color: 'var(--primary)', fontWeight: '600' }}>Đăng ký ngay</Link>
          </p>
        </div>
      </div>
    </>
  );
}
