'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Loader2, User, Mail, LogOut, Phone, MapPin } from 'lucide-react';
import { VnAddressSelect, emptyVnAddress, type VnAddressValue } from '@/components/shared/VnAddressSelect';

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  phone: string | null;
  address: string | null;
  ward: string | null;
  ward_code: string | null;
  province: string | null;
  province_code: string | null;
};

const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [vnAddress, setVnAddress] = useState<VnAddressValue>(emptyVnAddress);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

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
        .select('id, full_name, avatar_url, role, phone, address, ward, ward_code, province, province_code')
        .eq('id', user.id)
        .single();

      const row = data as Profile | null;
      if (row) {
        setProfile(row);
        setFullName(row.full_name || '');
        setPhone(row.phone || '');
        setStreetAddress(row.address || '');
        if (row.province_code && row.ward_code) {
          setVnAddress({
            province_code: row.province_code,
            province: row.province || '',
            ward_code: row.ward_code,
            ward: row.ward || '',
          });
        }
      }
      setLoading(false);
    })();
  }, [router, supabase]);

  const handleSave = async () => {
    if (!profile) return;
    setFeedback(null);

    if (!fullName.trim()) {
      setFeedback({ kind: 'error', message: 'Vui lòng nhập họ tên.' });
      return;
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      setFeedback({ kind: 'error', message: 'Số điện thoại không hợp lệ.' });
      return;
    }
    if (vnAddress.province_code && !vnAddress.ward_code) {
      setFeedback({ kind: 'error', message: 'Vui lòng chọn Phường / Xã.' });
      return;
    }

    setSaving(true);
    const { error } = await (supabase.from('profiles') as any)
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        address: streetAddress.trim() || null,
        ward: vnAddress.ward || null,
        ward_code: vnAddress.ward_code || null,
        province: vnAddress.province || null,
        province_code: vnAddress.province_code || null,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      setFeedback({ kind: 'error', message: 'Lỗi: ' + error.message });
    } else {
      setFeedback({ kind: 'success', message: 'Đã cập nhật hồ sơ!' });
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
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem' }}>
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

        {feedback && (
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            backgroundColor: feedback.kind === 'success' ? '#d1fae5' : '#fee2e2',
            color: feedback.kind === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.875rem',
          }}>
            {feedback.message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Họ và tên
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={120}
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <Phone size={14} style={{ display: 'inline', marginRight: 4 }} />
              Số điện thoại
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0901234567"
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none' }}
            />
          </div>
        </div>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 700, color: '#1a4d2e' }}>
          <MapPin size={16} style={{ display: 'inline', marginRight: 6 }} />
          Địa chỉ giao hàng mặc định
        </h3>

        <div style={{ marginBottom: '1rem' }}>
          <VnAddressSelect value={vnAddress} onChange={setVnAddress} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Số nhà, tên đường
          </label>
          <input
            type="text"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            maxLength={250}
            placeholder="VD: 12 Nguyễn Văn Cừ"
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
