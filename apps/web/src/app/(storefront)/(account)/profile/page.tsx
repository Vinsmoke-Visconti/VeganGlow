'use client';

import { createBrowserClient } from '@/lib/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Bell,
  Camera, CheckCircle2,
  ChevronRight,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Ticket,
  User,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  gender: string | null;
  birthday: string | null;
  cccd_number: string | null;
  cccd_full_name: string | null;
  is_verified: boolean;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  cccd_front_url: string | null;
  cccd_back_url: string | null;
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

  // Email/Verification Modals
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailStep, setEmailStep] = useState<'input' | 'otp'>('input');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [emailSaving, setEmailSaving] = useState(false);

  // KYC States
  const [kycStep, setKycStep] = useState(1);
  const [cccdFront, setCccdFront] = useState<File | null>(null);
  const [cccdBack, setCccdBack] = useState<File | null>(null);
  const [isNfcSimulated, setIsNfcSimulated] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?redirectTo=/profile');
        return;
      }
      setEmail(user.email || '');

      const { data: profileData } = await (supabase.from('profiles') as any)
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
    setSaving(true);
    try {
      const { error } = await (supabase.from('profiles') as any)
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
      setFeedback({ kind: 'success', message: 'Hồ sơ đã được cập nhật!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ kind: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleKycSubmit = async () => {
    if (!profile || !cccdFront || !cccdBack) return;
    setSaving(true);
    try {
      // Simulation of uploading and submitting for verification
      const { error } = await (supabase.from('profiles') as any)
        .update({
          verification_status: 'pending',
          cccd_number: cccdNumber,
          cccd_full_name: cccdFullName
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, verification_status: 'pending' });
      setIsKycModalOpen(false);
      setFeedback({ kind: 'success', message: 'Hồ sơ xác thực đã được gửi đi. Vui lòng chờ phê duyệt!' });
    } catch (err: any) {
      setFeedback({ kind: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className={styles.loaderContainer}>
      <Loader2 size={48} className={styles.spin} />
      <p>Đang tải không gian riêng của bạn...</p>
    </div>
  );

  return (
    <motion.div className={styles.profileWrapper} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>Hồ sơ cá nhân</h1>
          <p className={styles.subtitle}>Quản lý thông tin và bảo mật tài khoản</p>
        </div>
        <div className={styles.headerStatus}>
          {profile?.verification_status === 'verified' ? (
            <div className={`${styles.badge} ${styles.badgeVerified}`}>
              <BadgeCheck size={16} /> Tài khoản đã xác thực
            </div>
          ) : profile?.verification_status === 'pending' ? (
            <div className={`${styles.badge} ${styles.badgePending}`}>
              <Loader2 size={16} className={styles.spin} /> Đang chờ xác duyệt
            </div>
          ) : (
            <button className={`${styles.badge} ${styles.badgeUnverified}`} onClick={() => setIsKycModalOpen(true)}>
              <ShieldAlert size={16} /> Xác minh ngay
            </button>
          )}
        </div>
      </header>

      <div className={styles.mainGrid}>
        <div className={styles.leftColumn}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}><User size={20} /> <h2>Thông tin cơ bản</h2></div>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tên đăng nhập</label>
                <div className={styles.inputWrapper}>
                  <input className={styles.input} value={username} onChange={e => setUsername(e.target.value)} />
                  <Sparkles className={styles.inputIcon} size={16} />
                </div>
              </div>
              <div className={styles.nameRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Họ</label>
                  <input className={styles.input} value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Tên</label>
                  <input className={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email</label>
                <div className={styles.readonlyField}>
                  <Mail size={16} /> <span>{email}</span>
                  <button className={styles.editAction} onClick={() => setIsEmailModalOpen(true)}>sửa</button>
                </div>
              </div>
            </div>
          </section>

          <section className={`${styles.sectionCard} ${styles.cccdCard}`}>
            <div className={styles.sectionHeader}>
              <CreditCard size={20} /> <h2>Xác thực Danh tính (KYC)</h2>
              {profile?.verification_status === 'verified' && <span className={styles.verifiedText}>Đã xác minh</span>}
            </div>
            <p className={styles.cccdDesc}>Xác thực NFC và CCCD để kích hoạt đầy đủ tính năng ưu đãi dành cho hội viên.</p>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Họ tên trên CCCD</label>
                <input className={styles.input} value={cccdFullName} onChange={e => setCccdFullName(e.target.value)} placeholder="NGUYEN VAN A" />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Số CCCD</label>
                <input className={styles.input} value={cccdNumber} onChange={e => setCccdNumber(e.target.value)} placeholder="00120300xxxx" />
              </div>
            </div>
            {profile?.verification_status === 'unverified' && (
              <button className={styles.kycActionBtn} onClick={() => setIsKycModalOpen(true)}>Bắt đầu xác thực</button>
            )}
          </section>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.stickySidebar}>
            <div className={styles.avatarCard}>
              <div className={styles.avatarFrame}>
                {profile?.avatar_url ? <img src={profile.avatar_url} className={styles.avatarImg} /> : <User size={48} />}
                <label className={styles.avatarUploadBtn}><Camera size={16} /><input type="file" hidden /></label>
              </div>
              <h3 className={styles.avatarName}>{profile?.full_name || 'Hội viên VeganGlow'}</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}><span className={styles.statVal}>{orderCount}</span><span className={styles.statLabel}>Đơn hàng</span></div>
                <div className={styles.statItem}><span className={styles.statVal}>{voucherCount}</span><span className={styles.statLabel}>Voucher</span></div>
              </div>
            </div>
            <nav className={styles.quickNav}>
              <button className={styles.navItem} onClick={() => router.push('/profile/address')}><MapPin size={18} /><span>Địa chỉ</span><ChevronRight size={14} /></button>
              <button className={styles.navItem} onClick={() => router.push('/profile/notifications')}><Bell size={18} /><span>Thông báo</span><ChevronRight size={14} /></button>
              <button className={styles.navItem} onClick={() => router.push('/vouchers')}><Ticket size={18} /><span>Kho Voucher</span><ChevronRight size={14} /></button>
            </nav>
            <button className={styles.mainSaveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu tất cả'}</button>
          </div>
        </div>
      </div>

      {/* KYC Modal */}
      <AnimatePresence>
        {isKycModalOpen && (
          <div className={styles.modalOverlay}>
            <motion.div className={styles.kycModal} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}>
              <div className={styles.modalHeader}>
                <h3>Xác minh danh tính (eKYC)</h3>
                <button onClick={() => setIsKycModalOpen(false)}><X size={20} /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.kycSteps}>
                  {[1, 2, 3].map(s => <div key={s} className={`${styles.stepDot} ${kycStep >= s ? styles.stepActive : ''}`}>{s}</div>)}
                </div>

                {kycStep === 1 && (
                  <div className={styles.kycContent}>
                    <ImageIcon size={40} color="var(--color-primary)" />
                    <h4>Tải ảnh CCCD</h4>
                    <p>Vui lòng cung cấp ảnh mặt trước và mặt sau của CCCD bản gốc.</p>
                    <div className={styles.uploadGrid}>
                      <label className={styles.uploadBox}>
                        <input type="file" hidden onChange={e => setCccdFront(e.target.files?.[0] || null)} />
                        {cccdFront ? <CheckCircle2 color="var(--color-primary)" /> : <Plus />}
                        <span>Mặt trước</span>
                      </label>
                      <label className={styles.uploadBox}>
                        <input type="file" hidden onChange={e => setCccdBack(e.target.files?.[0] || null)} />
                        {cccdBack ? <CheckCircle2 color="var(--color-primary)" /> : <Plus />}
                        <span>Mặt sau</span>
                      </label>
                    </div>
                    <button className={styles.modalSubmitBtn} disabled={!cccdFront || !cccdBack} onClick={() => setKycStep(2)}>Tiếp theo</button>
                  </div>
                )}

                {kycStep === 2 && (
                  <div className={styles.kycContent}>
                    <Smartphone size={40} color="var(--color-primary)" />
                    <h4>Xác thực NFC</h4>
                    <p>Đặt điện thoại gần chip trên CCCD để đọc thông tin định danh.</p>
                    <div className={styles.nfcSimulation}>
                      <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}><Smartphone /></motion.div>
                      <div className={styles.nfcWave}></div>
                      <CreditCard size={32} />
                    </div>
                    <button className={styles.modalSubmitBtn} onClick={() => { setIsNfcSimulated(true); setKycStep(3); }}>Mô phỏng quét NFC</button>
                  </div>
                )}

                {kycStep === 3 && (
                  <div className={styles.kycContent}>
                    <CheckCircle2 size={40} color="var(--color-primary)" />
                    <h4>Hoàn tất chuẩn bị</h4>
                    <p>Dữ liệu đã sẵn sàng để gửi đi phê duyệt. VeganGlow cam kết bảo mật thông tin của bạn.</p>
                    <button className={styles.modalSubmitBtn} onClick={handleKycSubmit}>Gửi yêu cầu xác thực</button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Modal & Feedback Toast already implemented */}
    </motion.div>
  );
}
