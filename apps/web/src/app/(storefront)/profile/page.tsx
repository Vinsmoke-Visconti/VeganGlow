'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Loader2, User, Mail, LogOut } from 'lucide-react';

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?redirectTo=/profile');
        return;
      }
      setEmail(user.email || '');

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('id', user.id)
        .single();

      const row = data as Profile | null;
      if (row) {
        setProfile(row);
        setFullName(row.full_name || '');
      }
      setLoading(false);
    })();
  }, [router, supabase]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await (supabase.from('profiles') as any)
      .update({ full_name: fullName })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      alert('Lỗi: ' + error.message);
    } else {
      alert('Đã cập nhật hồ sơ!');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#666' }}>
        <Loader2 className="animate-spin" /> <span style={{ marginLeft: '0.75rem' }}>Đang tải hồ sơ…</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1a4d2e', marginBottom: '2rem' }}>
        Hồ sơ của tôi
      </h1>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e8f5e9', color: '#1a4d2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={32} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{fullName || 'Chưa đặt tên'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '0.875rem' }}>
              <Mail size={14} /> {email}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Họ và tên
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1, padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.75rem 1.5rem', backgroundColor: 'white', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
