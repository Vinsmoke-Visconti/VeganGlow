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
  X,
  FileText,
  Fingerprint,
  Plus,
  UserCheck,
  AlertCircle,
  Key
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
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKycBanner, setShowKycBanner] = useState(true);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  // Form States
  const [username, setUsername] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState('other');
  const [birthday, setBirthday] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [cccdFullName, setCccdFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Real stats
  const [orderCount, setOrderCount] = useState(0);
  const [voucherCount, setVoucherCount] = useState(0);

  // Modals
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [kycStep, setKycStep] = useState(1);

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

      // Fetch Real counts - NO MOCK DATA
      const [ordersRes, vouchersRes] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_vouchers').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_used', false)
      ]);

      setOrderCount(ordersRes.count || 0);
      setVoucherCount(vouchersRes.count || 0);
      setLoading(false);
    })();
  }, [router, supabase]);

  const handleSaveAll = async () => {
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
      setFeedback({ kind: 'success', message: 'Mọi thay đổi đã được lưu trữ thực tế!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ kind: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleKycSubmit = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      // Gửi dữ liệu thật vào Database
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
      setShowKycBanner(false);
      setFeedback({ kind: 'success', message: 'Yêu cầu định danh đã được gửi thực tế!' });
    } catch (err: any) {
      setFeedback({ kind: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className={styles.loaderContainer}>
      <Loader2 size={48} className={styles.spin} />
      <p>Đang truy vấn dữ liệu thực tế...</p>
    </div>
  );

  return (
    <motion.div className={styles.profileWrapper} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className={styles.cleanHeader}>
        <div>
          <h1 className={styles.cleanTitle}>Hồ sơ cá nhân</h1>
          <p className={styles.cleanSubtitle}>Dữ liệu tài khoản của bạn trên hệ thống VeganGlow</p>
        </div>
      </header>

      <div className={styles.cleanGrid}>
        <div className={styles.mainColumn}>
          
          <section className={styles.cleanCard}>
            <div className={styles.cardHeader}>
              <UserCheck size={20} />
              <h2>Thông tin cơ bản</h2>
            </div>
            <div className={styles.cleanForm}>
              <div className={styles.fieldGroup}>
                <label className={styles.cleanLabel}>Tên đăng nhập</label>
                <div className={styles.inputWrapper}>
                  <input className={styles.cleanInput} value={username} onChange={e => setUsername(e.target.value)} />
                  <Sparkles className={styles.inputIcon} size={16} />
                </div>
              </div>
              <div className={styles.cleanRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.cleanLabel}>Họ</label>
                  <input className={styles.cleanInput} value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.cleanLabel}>Tên</label>
                  <input className={styles.cleanInput} value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
              </div>
              <div className={styles.cleanRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.cleanLabel}>Số điện thoại</label>
                  <input className={styles.cleanInput} value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.cleanLabel}>Ngày sinh</label>
                  <input type="date" className={styles.cleanInput} value={birthday} onChange={e => setBirthday(e.target.value)} />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.cleanLabel}>Email</label>
                <div className={styles.readonlyField}>
                  <Mail size={16} /> <span>{email}</span>
                  <button className={styles.editAction} onClick={() => setIsEmailModalOpen(true)}>Sửa</button>
                </div>
              </div>
            </div>
          </section>

          <AnimatePresence>
            {showKycBanner && profile?.verification_status === 'unverified' && (
              <motion.section 
                className={styles.kycBanner}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <button className={styles.closeBanner} onClick={() => setShowKycBanner(false)}>
                  <X size={18} />
                </button>
                <div className={styles.kycIcon}>
                  <Fingerprint size={32} />
                </div>
                <div className={styles.kycInfo}>
                  <h3>Định danh tài khoản (Real Data)</h3>
                  <p>Cập nhật CCCD để hệ thống phê duyệt quyền lợi thực tế cho bạn.</p>
                  <button className={styles.kycActionBtn} onClick={() => setIsKycModalOpen(true)}>Xác thực ngay</button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {profile?.verification_status !== 'unverified' && (
            <section className={`${styles.cleanCard} ${styles.statusCard}`}>
              <div className={styles.cardHeader}>
                <BadgeCheck size={20} />
                <h2>Trạng thái Identity</h2>
              </div>
              <div className={styles.statusBox}>
                {profile?.verification_status === 'pending' ? (
                  <div className={styles.pendingStatus}>
                    <Loader2 size={24} className={styles.spin} />
                    <div>
                      <h4>Hồ sơ đã được lưu trữ & đang chờ phê duyệt</h4>
                      <p>Dữ liệu CCCD thực tế đã được gửi đi. Vui lòng chờ quản trị viên kiểm tra.</p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.verifiedStatus}>
                    <CheckCircle2 size={24} />
                    <div>
                      <h4>Tài khoản đã xác thực thật</h4>
                      <p>Mọi tính năng nâng cao đã được kích hoạt thực tế.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className={styles.sideColumn}>
          <div className={styles.profileSummary}>
            <div className={styles.avatarBox}>
              <div className={styles.avatarInner}>
                {profile?.avatar_url ? <img src={profile.avatar_url} /> : <User size={40} />}
                <label className={styles.camBtn}><Camera size={14} /><input type="file" hidden /></label>
              </div>
            </div>
            <h3 className={styles.profileName}>{profile?.full_name || "Hội viên thực tế"}</h3>
            <div className={styles.quickStats}>
              <div className={styles.stat}><span>{orderCount}</span><p>Đơn hàng thật</p></div>
              <div className={styles.stat}><span>{voucherCount}</span><p>Voucher thật</p></div>
            </div>
          </div>

          <nav className={styles.cleanNav}>
            {/* Fix 404 Links */}
            <button className={styles.navLink} onClick={() => router.push('/profile/address')}>
              <MapPin size={18} /> <span>Địa chỉ thực tế</span> <ChevronRight size={14} />
            </button>
            <button className={styles.navLink} onClick={() => router.push('/profile/bank')}>
              <CreditCard size={18} /> <span>Tài khoản ngân hàng</span> <ChevronRight size={14} />
            </button>
            <button className={styles.navLink} onClick={() => router.push('/vouchers')}>
              <Ticket size={18} /> <span>Kho Voucher thật</span> <ChevronRight size={14} />
            </button>
          </nav>

          <button className={styles.mainSaveBtn} onClick={handleSaveAll} disabled={saving}>
            {saving ? <Loader2 size={18} className={styles.spin} /> : "Lưu dữ liệu thực"}
          </button>
        </aside>
      </div>

      {/* KYC Modal - REMOVED SIMULATED NFC */}
      <AnimatePresence>
        {isKycModalOpen && (
          <div className={styles.modalOverlay}>
            <motion.div className={styles.kycModal} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}>
              <div className={styles.modalHeader}>
                <h3>Xác thực thông tin thật</h3>
                <button onClick={() => setIsKycModalOpen(false)}><X size={20} /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.kycSteps}>
                  {[1, 2].map(s => <div key={s} className={`${styles.stepDot} ${kycStep >= s ? styles.stepActive : ''}`}>{s}</div>)}
                </div>

                {kycStep === 1 && (
                  <div className={styles.kycContent}>
                    <FileText size={40} color="var(--color-primary)" />
                    <h4>Nhập thông tin CCCD thực</h4>
                    <p>Vui lòng nhập đúng thông tin trên thẻ CCCD của bạn để lưu trữ thực tế.</p>
                    <div className={styles.kycForm}>
                      <input className={styles.cleanInput} placeholder="NGUYEN VAN A" value={cccdFullName} onChange={e => setCccdFullName(e.target.value.toUpperCase())} />
                      <input className={styles.cleanInput} placeholder="Số CCCD (12 số)" value={cccdNumber} onChange={e => setCccdNumber(e.target.value)} />
                    </div>
                    <button className={styles.modalSubmitBtn} disabled={!cccdFullName || !cccdNumber} onClick={() => setKycStep(2)}>Tiếp theo</button>
                  </div>
                )}

                {kycStep === 2 && (
                  <div className={styles.kycContent}>
                    <CheckCircle2 size={40} color="var(--color-primary)" />
                    <h4>Xác nhận lưu trữ</h4>
                    <p>Thông tin của bạn sẽ được gửi trực tiếp vào hệ thống bảo mật của VeganGlow.</p>
                    <button className={styles.modalSubmitBtn} onClick={handleKycSubmit} disabled={saving}>
                      {saving ? <Loader2 size={18} className={styles.spin} /> : "Gửi yêu cầu xác thực thật"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedback && (
          <motion.div 
            className={`${styles.toast} ${styles[feedback.kind]}`}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            {feedback.kind === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
