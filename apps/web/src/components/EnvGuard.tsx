'use client';

import { useEffect, useState } from 'react';

export default function EnvGuard({ children }: { children: React.ReactNode }) {
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      setIsValid(false);
      return;
    }

    if (supabaseUrl.includes('your-project') || supabaseKey.includes('your-anon-key')) {
      setIsValid(false);
      return;
    }

    // Try a simple ping or check format
    if (supabaseUrl.startsWith('http')) {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  }, []);

  if (isValid === null) {
    return <div>Đang kiểm tra kết nối hệ thống...</div>;
  }

  if (!isValid) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: 'red' }}>Lỗi cấu hình môi trường (.env)</h1>
        <p>Không tìm thấy file <code>.env.local</code> hoặc thông tin kết nối Supabase không hợp lệ.</p>
        <p>Vui lòng cập nhật <code>NEXT_PUBLIC_SUPABASE_URL</code> và <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> với mật khẩu và key đúng.</p>
      </div>
    );
  }

  return <>{children}</>;
}
