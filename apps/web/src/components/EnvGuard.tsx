'use client';

import { useEffect, useState } from 'react';

/**
 * EnvGuard - Passively checks if required environment variables are present.
 * If missing, it shows a helpful error message instead of letting the app crash silently.
 */
export default function EnvGuard({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
      setError('Thiếu cấu hình kết nối Supabase (.env.local)');
    }
  }, []);

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: '#fff1f2',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ 
          backgroundColor: '#fee2e2', 
          padding: '2rem', 
          borderRadius: '1rem', 
          border: '1px solid #fecaca',
          maxWidth: '500px'
        }}>
          <h1 style={{ color: '#991b1b', marginBottom: '1rem' }}>Lỗi Cấu Hình</h1>
          <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>
            Không tìm thấy thông tin kết nối Supabase hợp lệ trong file <code>.env.local</code>.
          </p>
          <div style={{ textAlign: 'left', background: '#fff', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
            <p>Vui lòng kiểm tra file <strong>apps/web/.env.local</strong>:</p>
            <code>NEXT_PUBLIC_SUPABASE_URL=...</code><br/>
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</code>
          </div>
          <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#7f1d1d' }}>
            Sau khi cập nhật, hãy khởi động lại server <code>npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  // If no error, just show the app immediately.
  return <>{children}</>;
}
