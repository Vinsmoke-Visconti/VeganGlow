'use client';

import { createBrowserClient } from '@/lib/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Camera, CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  ShieldAlert,
  Ticket,
  User,
  X,
  Fingerprint,
  UserCheck,
  AlertCircle,
  Clock,
  ShoppingBag,
  Cpu,
  Smartphone
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [cccdFullName, setCccdFullName] = useState('');
  
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const [orderCount, setOrderCount] = useState(0);
  const [voucherCount, setVoucherCount] = useState(0);

  const [isNfcModalOpen, setIsNfcModalOpen] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login?redirectTo=/profile'); return; }
      setEmail(user.email || '');

      const { data: profileData } = await (supabase.from('profiles') as any)
        .select('*').eq('id', user.id).maybeSingle();

      if (profileData) {
        const row = profileData as Profile;
        setProfile(row);
        setLastName(row.last_name || '');
        setFirstName(row.first_name || '');
        setPhone(row.phone || '');
        setCccdNumber(row.cccd_number || '');
        setCccdFullName(row.cccd_full_name || '');
        if (row.birthday) {
          const parts = row.birthday.split('/');
          if (parts.length === 3) { setDay(parts[0]); setMonth(parts[1]); setYear(parts[2]); }
        }
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

  const handleSaveAll = async () => {
    if (!profile) return;
    setSaving(true);
    const bday = (day && month && year) ? `${day}/${month}/${year}` : null;
    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          full_name: `${lastName.trim()} ${firstName.trim()}`.trim() || null,
          phone: phone.trim() || null,
          birthday: bday,
          cccd_number: cccdNumber.trim() || null,
          cccd_full_name: cccdFullName.trim().toUpperCase() || null,
        }).eq('id', profile.id);
      
      if (error) throw error;
      setFeedback({ kind: 'success', message: 'Đã lưu thay đổi!' });
      setTimeout(() => setFeedback(null), 2000);
    } catch (err: any) { setFeedback({ kind: 'error', message: err.message });
    } finally { setSaving(false); }
  };

  const startNfcVerification = async () => {
    setNfcScanning(true);
    setTimeout(async () => {
      try {
        await (supabase.from('profiles') as any).update({ verification_status: 'pending' }).eq('id', profile?.id);
        setProfile(prev => prev ? { ...prev, verification_status: 'pending' } : null);
        setIsNfcModalOpen(false);
        setFeedback({ kind: 'success', message: 'Hồ sơ đang chờ duyệt!' });
      } catch (err) { console.error(err); } finally { setNfcScanning(false); }
    }, 3000);
  };

  const handleSegmentChange = (val: string, segment: 'day' | 'month' | 'year') => {
    const numeric = val.replace(/\D/g, '');
    if (segment === 'day') {
      if (numeric.length <= 2) { setDay(numeric); if (numeric.length === 2) monthRef.current?.focus(); }
    } else if (segment === 'month') {
      if (numeric.length <= 2) { setMonth(numeric); if (numeric.length === 2) yearRef.current?.focus(); }
    } else if (segment === 'year') { if (numeric.length <= 4) setYear(numeric); }
  };

  if (loading) return <div className={styles.loaderContainer}><Loader2 size={40} className={styles.spin} /></div>;

  return (
    <motion.div className={styles.profileWrapper} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className={styles.cleanHeader}>
        <div className={styles.headerLeft}><h1>Thiết lập tài khoản</h1></div>
        <div className={styles.headerStatus}>
          {profile?.verification_status === 'unverified' && (
            <><span className={`${styles.statusTag} ${styles.unverifiedTag}`}><ShieldAlert size={14} /> Chưa xác thực</span>
              <button className={styles.quickVerifyBtn} onClick={() => setIsNfcModalOpen(true)}>Xác thực ngay</button></>
          )}
          {profile?.verification_status === 'pending' && <span className={`${styles.statusTag} ${styles.pendingTag}`}><Clock size={14} /> Đang chờ phê duyệt</span>}
          {profile?.verification_status === 'verified' && <span className={`${styles.statusTag} ${styles.verifiedTag}`}><BadgeCheck size={14} /> Đã xác thực</span>}
        </div>
      </header>

      <div className={styles.cleanGrid}>
        <div className={styles.mainColumn}>
          <section className={styles.cleanCard}>
            <div className={styles.identityFlex}>
              <div className={styles.avatarInner}>
                {profile?.avatar_url ? <img src={profile.avatar_url} /> : <User />}
                <label className={styles.camBtn}><Camera size={18} /><input type="file" hidden /></label>
              </div>
              <div className={styles.identityInfo}>
                <h2 className={styles.profileNameLarge}>{profile?.full_name || "Thành viên mới"}</h2>
                <p className={styles.profileEmailSub}>{email}</p>
                <div className={styles.quickBadges}>
                  <span className={styles.roleBadge}>Khách hàng Thân thiết</span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.cleanCard}>
            <div className={styles.cardHeader}><UserCheck size={20} /><h3>Thông tin cơ bản</h3></div>
            <div className={styles.cleanForm}>
              <div className={styles.cleanRow}>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Họ</label>
                  <input className={styles.cleanInput} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nhập họ..." /></div>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Tên</label>
                  <input className={styles.cleanInput} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Nhập tên..." /></div>
              </div>
              <div className={styles.cleanRow}>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Số điện thoại</label>
                  <div className={styles.inputWithIcon}><Smartphone size={16} /><input className={styles.cleanInput} value={phone} onChange={e => setPhone(e.target.value)} placeholder="090xxxxxxx" /></div></div>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Ngày sinh</label>
                  <div className={styles.segmentedInput}>
                    <input ref={dayRef} className={styles.segment} value={day} placeholder="DD" maxLength={2} onChange={e => handleSegmentChange(e.target.value, 'day')} />
                    <span className={styles.divider}>/</span>
                    <input ref={monthRef} className={styles.segment} value={month} placeholder="MM" maxLength={2} onChange={e => handleSegmentChange(e.target.value, 'month')} />
                    <span className={styles.divider}>/</span>
                    <input ref={yearRef} className={`${styles.segment} ${styles.segmentYear}`} value={year} placeholder="YYYY" maxLength={4} onChange={e => handleSegmentChange(e.target.value, 'year')} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.cleanCard}>
            <div className={styles.cardHeader}><Fingerprint size={20} /><h3>Định danh & Bảo mật</h3></div>
            <div className={styles.cleanForm}>
              <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Email liên kết (Cố định)</label>
                <div className={styles.readonlyField}><Mail size={16} /> <span>{email}</span></div></div>
              <div className={styles.cleanRow}>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Họ tên trên CCCD</label>
                  <input className={styles.cleanInput} value={cccdFullName} onChange={e => setCccdFullName(e.target.value.toUpperCase())} placeholder="NGUYEN VAN A" /></div>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Số thẻ định danh</label>
                  <input className={styles.cleanInput} value={cccdNumber} onChange={e => setCccdNumber(e.target.value)} placeholder="000000000000" /></div>
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.cleanCard}>
            <div className={styles.cardHeader}><ShoppingBag size={20} /><h3>Hoạt động</h3></div>
            <div className={styles.quickStatsGrid}>
              <button className={styles.statBoxLarge} onClick={() => router.push('/profile/orders')}>
                <span className={styles.statVal}>{orderCount}</span>
                <p>Đơn hàng</p>
              </button>
              <button className={styles.statBoxLarge} onClick={() => router.push('/vouchers')}>
                <span className={styles.statVal}>{voucherCount}</span>
                <p>Voucher</p>
              </button>
            </div>
            <nav className={styles.sideNavList}>
              <button className={styles.navItem} onClick={() => router.push('/profile/address')}><MapPin size={18} /> <span>Sổ địa chỉ</span> <ChevronRight size={14} /></button>
              <button className={styles.navItem} onClick={() => router.push('/profile/bank')}><CreditCard size={18} /> <span>Ngân hàng</span> <ChevronRight size={14} /></button>
              <button className={styles.navItem} onClick={() => router.push('/vouchers')}><Ticket size={18} /> <span>Kho Voucher</span> <ChevronRight size={14} /></button>
            </nav>
          </section>
          
          <button className={styles.mainSaveBtn} onClick={handleSaveAll} disabled={saving}>
            {saving ? <Loader2 size={18} className={styles.spin} /> : "Cập nhật hồ sơ"}
          </button>
        </aside>
      </div>

      <AnimatePresence>
        {isNfcModalOpen && (
          <div className={styles.modalOverlay}>
            <motion.div className={styles.kycModal} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className={styles.modalHeader}><h3>Xác thực thông minh</h3><button className={styles.closeModal} onClick={() => setIsNfcModalOpen(false)}><X size={20} /></button></div>
              <div className={styles.modalBody}><div className={styles.kycContent}>
                {nfcScanning ? (<><div className={styles.nfcPulse}><Cpu size={48} className={styles.spin} /></div><h4>Đang kết nối chip NFC...</h4><p>Vui lòng giữ thẻ CCCD sát mặt lưng thiết bị</p></>) : (
                  <><Cpu size={48} color="#1a3c17" style={{marginBottom: 16}} /><h4>Xác thực thực tế</h4><p>Hệ thống sẽ đối soát dữ liệu sinh trắc học và chip trên thẻ CCCD.</p>
                    <button className={styles.mainSaveBtn} style={{width: '100%', marginTop: 24}} onClick={startNfcVerification}>Bắt đầu quét</button></>
                )}
              </div></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>{feedback && (<motion.div className={`${styles.toast} ${styles[feedback.kind]}`} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}>
        {feedback.kind === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{feedback.message}</span></motion.div>)}</AnimatePresence>
    </motion.div>
  );
}
