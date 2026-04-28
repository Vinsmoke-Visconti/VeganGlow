'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { 
  Loader2, User, Mail, Phone, Bell, 
  Camera, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './profile.module.css';

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
  phone: string | null;
  address: string | null;
  ward: string | null;
  ward_code: string | null;
  province: string | null;
  province_code: string | null;
  gender: string | null;
  birthday: string | null;
  cccd_number: string | null;
  cccd_full_name: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [username, setUsername] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState('other');
  const [birthday, setBirthday] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [cccdFullName, setCccdFullName] = useState('');
  const [phone, setPhone] = useState('');
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
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const row = data as Profile | null;
      if (row) {
        setProfile(row);
        setLastName(row.last_name || '');
        setFirstName(row.first_name || '');
        setPhone(row.phone || '');
        setUsername(row.username || '');
        setGender(row.gender || 'other');
        setBirthday(row.birthday || '');
        setCccdNumber(row.cccd_number || '');
        setCccdFullName(row.cccd_full_name || '');
      }
      setLoading(false);
    })();
  }, [router, supabase]);

  const handleSave = async () => {
    if (!profile) return;
    setFeedback(null);

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: username.trim() || null,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        full_name: `${lastName.trim()} ${firstName.trim()}`.trim() || null,
        phone: phone.trim() || null,
        gender: gender,
        birthday: birthday || null,
        cccd_number: cccdNumber.trim() || null,
        cccd_full_name: cccdFullName.trim() || null,
      })
      .eq('id', profile.id);
    
    setSaving(false);
    if (error) {
      setFeedback({ kind: 'error', message: 'Lỗi: ' + error.message });
    } else {
      setFeedback({ kind: 'success', message: 'Hồ sơ đã được cập nhật thành công!' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !profile) return;

      if (file.size > 1024 * 1024) {
        setFeedback({ kind: 'error', message: 'Dung lượng file quá lớn (tối đa 1MB).' });
        return;
      }

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      setFeedback({ kind: 'success', message: 'Cập nhật ảnh đại diện thành công!' });
    } catch (err: any) {
      setFeedback({ kind: 'error', message: 'Lỗi: ' + err.message });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p>Đang chuẩn bị không gian của bạn...</p>
      </div>
    );
  }

  return (
    <div className={styles.profileWrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Hồ sơ của tôi</h1>
        <p className={styles.subtitle}>Quản lý thông tin cá nhân để bảo mật tài khoản tốt hơn</p>
      </header>

      <div className={styles.profileLayout}>
        <div className={styles.formSection}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Tên đăng nhập</div>
            <div className={styles.fieldValue}>
              <input 
                type="text" 
                className={styles.input} 
                value={username}
                placeholder="Ví dụ: Terrykote"
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Họ</div>
            <div className={styles.fieldValue}>
              <input 
                type="text" 
                className={styles.input} 
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Họ của bạn"
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Tên</div>
            <div className={styles.fieldValue}>
              <input 
                type="text" 
                className={styles.input} 
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Tên của bạn"
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Email</div>
            <div className={styles.fieldValue}>
              <span className={styles.maskedText}>
                {email ? email.replace(/(.{2})(.*)(@.*)/, '$1******$3') : 'Chưa thiết lập'}
              </span>
              <button className={styles.textAction} onClick={() => alert('Vui lòng liên hệ hỗ trợ để đổi Email')}>Sửa</button>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Số điện thoại</div>
            <div className={styles.fieldValue}>
              <span className={styles.maskedText}>
                {phone ? phone.replace(/(.{2})(.*)(.{2})/, '$1*********$3') : 'Chưa thiết lập'}
              </span>
              <button className={styles.textAction} onClick={() => {
                const val = prompt('Nhập số điện thoại mới:', phone);
                if (val !== null) setPhone(val);
              }}>Sửa</button>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Giới tính</div>
            <div className={styles.fieldValue}>
              <div className={styles.radioGroup}>
                <label className={styles.radioItem}>
                  <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} />
                  <span>Nam</span>
                </label>
                <label className={styles.radioItem}>
                  <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={() => setGender('female')} />
                  <span>Nữ</span>
                </label>
                <label className={styles.radioItem}>
                  <input type="radio" name="gender" value="other" checked={gender === 'other'} onChange={() => setGender('other')} />
                  <span>Khác</span>
                </label>
              </div>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Ngày sinh</div>
            <div className={styles.fieldValue}>
              <input 
                type="date" 
                className={styles.input} 
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}></div>
            <div className={styles.fieldValue}>
              <button 
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.avatarSidebar}>
          <div className={styles.avatarContainer}>
            {uploading ? (
              <div className={styles.avatarMainPlaceholder}><Loader2 className="animate-spin" size={32} /></div>
            ) : profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className={styles.avatarMain} />
            ) : (
              <div className={styles.avatarMainPlaceholder}><User size={64} /></div>
            )}
          </div>
          <label className={styles.selectBtn} style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
            <Camera size={16} style={{ marginRight: '8px', display: 'inline' }} />
            {uploading ? 'Đang tải...' : 'Chọn ảnh'}
            <input 
              type="file" 
              accept="image/png, image/jpeg" 
              onChange={handleAvatarUpload} 
              style={{ display: 'none' }} 
              disabled={uploading}
            />
          </label>
          <div className={styles.avatarRules}>
            <p>Dung lượng tối đa 1 MB</p>
            <p>Định dạng: .JPEG, .PNG</p>
          </div>
        </div>
      </div>

      <div className={styles.cccdSection}>
        <div className={styles.cccdHeader}>
          <h2 className={styles.cccdTitle}>Thông tin cá nhân (CCCD)</h2>
          <p className={styles.cccdNotice}>
            Bạn vui lòng nhập chính xác thông tin CCCD để đơn hàng được thông quan theo quy định. 
            Thông tin sẽ được bảo mật tuyệt đối.
          </p>
        </div>

        <div className={styles.cccdForm}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Họ và tên (CCCD)</div>
            <div className={styles.fieldValue}>
              <span className={styles.maskedText}>
                {cccdFullName ? cccdFullName.replace(/(.).*(.)/, (match, p1, p2) => p1 + '*'.repeat(match.length - 2) + p2).toUpperCase() : 'CHƯA THIẾT LẬP'}
              </span>
              <button className={styles.textAction} onClick={() => {
                const val = prompt('Nhập Họ và tên theo CCCD:', cccdFullName);
                if (val !== null) setCccdFullName(val);
              }}>Sửa</button>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}>Số CCCD</div>
            <div className={styles.fieldValue}>
              <span className={styles.maskedText}>
                {cccdNumber ? cccdNumber.replace(/.*(.{4})/, (match, p1) => '*'.repeat(match.length - 4) + p1) : 'CHƯA THIẾT LẬP'}
              </span>
              <button className={styles.textAction} onClick={() => {
                const val = prompt('Nhập số CCCD:', cccdNumber);
                if (val !== null) setCccdNumber(val);
              }}>Sửa</button>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldLabel}></div>
            <div className={styles.fieldValue}>
              <button className={styles.confirmBtn} onClick={handleSave}>Xác nhận định danh</button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`${styles.feedback} ${feedback.kind === 'success' ? styles.success : styles.error}`}
          >
            {feedback.kind === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
