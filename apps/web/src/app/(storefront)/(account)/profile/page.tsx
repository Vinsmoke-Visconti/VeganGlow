'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { 
  Loader2, User, Mail, Phone, Bell, 
  Camera, CheckCircle2, AlertCircle,
  ShieldCheck, MapPin, Calendar, CreditCard,
  ChevronRight, Sparkles, ShoppingBag, Ticket,
  X, Send, ShieldQuestion, FileText, Image as ImageIcon,
  Smartphone, ShieldAlert, BadgeCheck, Plus, Fingerprint,
  Verified
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
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  is_verified: boolean;
};

type Verification = {
  status: 'pending' | 'approved' | 'rejected' | 'unverified';
  full_name?: string;
  id_number?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [verification, setVerification] = useState<Verification>({ status: 'unverified' });
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form States
  const [username, setUsername] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState('other');
  const [birthday, setBirthday] = useState('');
  const [phone, setPhone] = useState('');
  const [orderCount, setOrderCount] = useState(0);
  const [voucherCount, setVoucherCount] = useState(0);
  
  // KYC / Email Modals
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [kycStep, setKycStep] = useState(1);
  const [cccdFront, setCccdFront] = useState<File | null>(null);
  const [cccdBack, setCccdBack] = useState<File | null>(null);
  const [cccdFullName, setCccdFullName] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?redirectTo=/profile');
        return;
      }
      setEmail(user.email || '');

      const [profileRes, verRes, ordersRes, vouchersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('user_verifications').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_vouchers').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_used', false)
      ]);

      if (profileRes.data) {
        const row = profileRes.data as Profile;
        setProfile(row);
        setLastName(row.last_name || '');
        setFirstName(row.first_name || '');
        setPhone(row.phone || '');
        setUsername(row.username || '');
        setGender(row.gender || 'other');
        setBirthday(row.birthday || '');
      }

      if (verRes.data) {
        setVerification(verRes.data as Verification);
      }

      setOrderCount(ordersRes.count || 0);
      setVoucherCount(vouchersRes.count || 0);
      setLoading(false);
    })();
  }, [router, supabase]);

  const handleKycSubmit = async () => {
    if (!profile || !cccdFront || !cccdBack) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('user_verifications').insert({
        user_id: user.id,
        full_name: cccdFullName,
        id_number: cccdNumber,
        status: 'pending'
      });

      if (error) throw error;

      setVerification({ status: 'pending', full_name: cccdFullName, id_number: cccdNumber });
      setIsKycModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className={styles.loaderContainer}>
      <Loader2 size={48} className={styles.spin} />
      <p>Đang tải dữ liệu định danh...</p>
    </div>
  );

  return (
    <motion.div className={styles.profileWrapper} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>Hồ sơ cá nhân</h1>
          <p className={styles.subtitle}>Quản lý định danh và bảo mật Microservices</p>
        </div>
        <div className={styles.headerStatus}>
          {profile?.is_verified ? (
            <div className={`${styles.badge} ${styles.badgeVerified}`}>
              <BadgeCheck size={16} /> Tài khoản đã xác thực
            </div>
          ) : verification.status === 'pending' ? (
            <div className={`${styles.badge} ${styles.badgePending}`}>
              <Loader2 size={16} className={styles.spin} /> Chờ Identity Service duyệt
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
          {/* Identity Info Card */}
          <section className={styles.identityHero}>
            <div className={styles.heroContent}>
              <div className={styles.heroIcon}>
                <Fingerprint size={40} />
              </div>
              <div className={styles.heroText}>
                <h3>Xác thực danh tính (eKYC)</h3>
                <p>Nâng cao bảo mật tài khoản và nhận ưu đãi đặc quyền cho hội viên VeganGlow.</p>
              </div>
            </div>
            <div className={styles.heroStatus}>
              {verification.status === 'unverified' ? (
                <div className={styles.unverifiedBanner}>
                  <AlertCircle size={20} />
                  <span>Tài khoản của bạn chưa được xác thực danh tính.</span>
                  <button onClick={() => setIsKycModalOpen(true)}>Bắt đầu ngay</button>
                </div>
              ) : verification.status === 'pending' ? (
                <div className={styles.pendingBanner}>
                  <Loader2 size={20} className={styles.spin} />
                  <span>Hồ sơ đang được Identity-Service xử lý. Vui lòng chờ 24h.</span>
                </div>
              ) : (
                <div className={styles.verifiedBanner}>
                  <ShieldCheck size={20} />
                  <span>Định danh đã được xác thực thành công.</span>
                </div>
              )}
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}><User size={20} /> <h2>Thông tin cơ bản</h2></div>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tên đăng nhập</label>
                <input className={styles.input} value={username} onChange={e => setUsername(e.target.value)} />
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
                <label className={styles.label}>Email (ReadOnly)</label>
                <div className={styles.readonlyInput}><Mail size={16} /> <span>{email}</span></div>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.avatarCard}>
            <div className={styles.avatarFrame}>
              {profile?.avatar_url ? <img src={profile.avatar_url} className={styles.avatarImg} /> : <User size={48} />}
              <label className={styles.avatarUploadBtn}><Camera size={16} /><input type="file" hidden /></label>
            </div>
            <h3>{profile?.full_name || 'Hội viên'}</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}><span className={styles.statVal}>{orderCount}</span><span className={styles.statLabel}>Đơn hàng</span></div>
              <div className={styles.statItem}><span className={styles.statVal}>{voucherCount}</span><span className={styles.statLabel}>Voucher</span></div>
            </div>
          </div>
          
          <nav className={styles.quickNav}>
            <button className={styles.navItem} onClick={() => router.push('/profile/address')}><MapPin size={18} /><span>Địa chỉ</span><ChevronRight size={14} /></button>
            <button className={styles.navItem} onClick={() => router.push('/profile/bank')}><CreditCard size={18} /><span>Ngân hàng</span><ChevronRight size={14} /></button>
            <button className={styles.navItem} onClick={() => router.push('/vouchers')}><Ticket size={18} /><span>Kho Voucher</span><ChevronRight size={14} /></button>
          </nav>
        </div>
      </div>

      {/* KYC Modal - Reused from before but connecting to new Identity Table */}
      <AnimatePresence>
        {isKycModalOpen && (
          <div className={styles.modalOverlay}>
            <motion.div className={styles.kycModal} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
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
                    <p>Cung cấp ảnh mặt trước/sau để Identity Service đối soát.</p>
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
                    <FileText size={40} color="var(--color-primary)" />
                    <h4>Thông tin CCCD</h4>
                    <div className={styles.kycForm}>
                      <input className={styles.input} placeholder="Họ tên đầy đủ" value={cccdFullName} onChange={e => setCccdFullName(e.target.value)} />
                      <input className={styles.input} placeholder="Số CCCD (12 số)" value={cccdNumber} onChange={e => setCccdNumber(e.target.value)} />
                    </div>
                    <button className={styles.modalSubmitBtn} disabled={!cccdFullName || !cccdNumber} onClick={() => setKycStep(3)}>Tiếp theo</button>
                  </div>
                )}

                {kycStep === 3 && (
                  <div className={styles.kycContent}>
                    <Smartphone size={40} color="var(--color-primary)" />
                    <h4>Mô phỏng NFC</h4>
                    <div className={styles.nfcBox}>
                      <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity }}><Smartphone /></motion.div>
                    </div>
                    <button className={styles.modalSubmitBtn} onClick={handleKycSubmit} disabled={saving}>
                      {saving ? <Loader2 className={styles.spin} /> : 'Gửi yêu cầu xác thực'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
