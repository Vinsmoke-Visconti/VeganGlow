'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { 
  Loader2, User, Mail, Phone, Bell, 
  Camera, CheckCircle2, AlertCircle,
  ShieldCheck, MapPin, Calendar, CreditCard,
  ChevronRight, Sparkles, ShoppingBag, Ticket
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
  const [orderCount, setOrderCount] = useState(0);
  const [voucherCount, setVoucherCount] = useState(0);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?redirectTo=/profile');
        return;
      }
      setEmail(user.email || '');

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        const row = profileData as Profile;
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

      // Fetch stats
      const [ordersRes, vouchersRes] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_vouchers').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_used', false)
      ]);

      setOrderCount(ordersRes.count || 0);
      setVoucherCount(vouchersRes.count || 0);
      
      setLoading(false);
    })();
  }, [router, supabase]);

  const handleSave = async () => {
    if (!profile) return;
    setFeedback(null);
    setSaving(true);

    try {
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

      if (error) throw error;

      setFeedback({ kind: 'success', message: 'Hồ sơ đã được cập nhật thành công!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ kind: 'error', message: 'Lỗi: ' + (err.message || 'Không thể lưu thay đổi') });
    } finally {
      setSaving(false);
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
      const filePath = `${profile.id}/avatar-${Date.now()}.${fileExt}`;

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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={48} color="var(--color-primary)" />
        </motion.div>
        <p className={styles.loaderText}>Đang chuẩn bị không gian của bạn...</p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  return (
    <motion.div 
      className={styles.profileWrapper}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>Hồ sơ cá nhân</h1>
          <p className={styles.subtitle}>Quản lý thông tin và bảo mật tài khoản của bạn</p>
        </div>
        <div className={styles.headerStatus}>
          <div className={styles.badge}>
            <ShieldCheck size={16} />
            Tài khoản đã xác thực
          </div>
        </div>
      </header>

      <div className={styles.mainGrid}>
        <div className={styles.leftColumn}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <User size={20} />
              <h2>Thông tin cơ bản</h2>
            </div>
            
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tên đăng nhập</label>
                <div className={styles.inputWrapper}>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={username}
                    placeholder="Chọn một tên đăng nhập độc đáo"
                    onChange={e => setUsername(e.target.value)}
                  />
                  <Sparkles className={styles.inputIcon} size={16} />
                </div>
              </div>

              <div className={styles.nameRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Họ</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Họ"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Tên</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Tên"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email</label>
                <div className={styles.readonlyField}>
                  <Mail size={16} />
                  <span>{email || 'Chưa liên kết'}</span>
                  <button className={styles.editAction} onClick={() => alert('Liên hệ hỗ trợ để đổi Email')}>Thay đổi</button>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Số điện thoại</label>
                <div className={styles.inputWrapper}>
                  <Phone size={16} className={styles.inputIconLeft} />
                  <input 
                    type="tel" 
                    className={`${styles.input} ${styles.hasIconLeft}`} 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Giới tính</label>
                <div className={styles.genderGrid}>
                  {['male', 'female', 'other'].map((g) => (
                    <button
                      key={g}
                      className={`${styles.genderTab} ${gender === g ? styles.genderTabActive : ''}`}
                      onClick={() => setGender(g)}
                    >
                      {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Ngày sinh</label>
                <div className={styles.inputWrapper}>
                  <Calendar size={16} className={styles.inputIconLeft} />
                  <input 
                    type="date" 
                    className={`${styles.input} ${styles.hasIconLeft}`} 
                    value={birthday}
                    onChange={e => setBirthday(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className={`${styles.sectionCard} ${styles.cccdCard}`}>
            <div className={styles.sectionHeader}>
              <CreditCard size={20} />
              <h2>Định danh cá nhân (CCCD)</h2>
              <div className={styles.securityBadge}>Bảo mật 256-bit</div>
            </div>
            
            <p className={styles.cccdDesc}>
              Thông tin CCCD giúp quá trình thông quan và giao hàng diễn ra thuận lợi hơn. 
              Dữ liệu được mã hóa và chỉ sử dụng cho mục đích vận chuyển.
            </p>

            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Họ và tên trên CCCD</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={cccdFullName}
                  onChange={e => setCccdFullName(e.target.value)}
                  placeholder="VIẾT HOA CÓ DẤU"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Số CCCD</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={cccdNumber}
                  onChange={e => setCccdNumber(e.target.value)}
                  placeholder="12 số căn cước"
                />
              </div>
            </div>
          </section>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.stickySidebar}>
            <div className={styles.avatarCard}>
              <div className={styles.avatarFrame}>
                {uploading ? (
                  <div className={styles.avatarLoading}><Loader2 className="animate-spin" /></div>
                ) : profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarPlaceholder}><User size={48} /></div>
                )}
                <label className={styles.avatarUploadBtn}>
                  <Camera size={16} />
                  <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                </label>
              </div>
              <h3 className={styles.avatarName}>{profile?.full_name || 'Người dùng mới'}</h3>
              <p className={styles.avatarEmail}>{email}</p>
              
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statVal}>{orderCount}</span>
                  <span className={styles.statLabel}>Đơn hàng</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statVal}>{voucherCount}</span>
                  <span className={styles.statLabel}>Voucher</span>
                </div>
              </div>
            </div>

            <nav className={styles.quickNav}>
              <button className={styles.navItem} onClick={() => router.push('/profile/address')}>
                <MapPin size={18} />
                <span>Địa chỉ của tôi</span>
                <ChevronRight size={14} />
              </button>
              <button className={styles.navItem} onClick={() => router.push('/profile/notifications')}>
                <Bell size={18} />
                <span>Thông báo</span>
                <ChevronRight size={14} />
              </button>
            </nav>

            <button 
              className={styles.mainSaveBtn}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : 'Lưu tất cả thay đổi'}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`${styles.feedbackToast} ${feedback.kind === 'success' ? styles.toastSuccess : styles.toastError}`}
          >
            {feedback.kind === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
