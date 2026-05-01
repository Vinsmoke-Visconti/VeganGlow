'use client';

import { createBrowserClient } from '@/lib/supabase/client';
import Image from 'next/image';
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
  Smartphone,
  Crown,
  Star,
  Gem,
  Gift,
  Truck,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './profile.module.css';

type LoyaltyTier = {
  id: string;
  name: string;
  display_name: string;
  min_lifetime_spend: number;
  discount_percent: number;
  perks: Record<string, boolean | number> | null;
  badge_color: string;
  position: number;
};

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
  lifetime_spend: number;
  loyalty_points: number;
  tier_id: string | null;
};

type ProfileUpdatePayload = Partial<{
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  birthday: string | null;
  cccd_number: string | null;
  cccd_full_name: string | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
}>;

type ProfileUpdateClient = {
  update: (row: ProfileUpdatePayload) => {
    eq: (column: 'id', value: string) => Promise<{ error: { message: string } | null }>;
  };
};

/* ── Tier visual config ── */
const TIER_ICONS: Record<string, React.ReactNode> = {
  member: <Star size={20} />,
  silver: <Star size={20} />,
  gold: <Crown size={20} />,
  platinum: <Gem size={20} />,
  diamond: <Gem size={20} />,
};

const PERK_LABELS: Record<string, { icon: React.ReactNode; label: string }> = {
  freeShippingThreshold: { icon: <Truck size={14} />, label: 'Miễn phí vận chuyển' },
  birthdayGift: { icon: <Gift size={14} />, label: 'Quà tặng sinh nhật' },
  earlyAccess: { icon: <Zap size={14} />, label: 'Truy cập sớm sản phẩm mới' },
  personalShopper: { icon: <UserCheck size={14} />, label: 'Tư vấn cá nhân' },
  vipLounge: { icon: <Crown size={14} />, label: 'VIP Lounge' },
  exclusiveEvents: { icon: <Star size={14} />, label: 'Sự kiện độc quyền' },
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
  const [username, setUsername] = useState('');
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

  /* ── Loyalty state ── */
  const [currentTier, setCurrentTier] = useState<LoyaltyTier | null>(null);
  const [nextTier, setNextTier] = useState<LoyaltyTier | null>(null);
  const [allTiers, setAllTiers] = useState<LoyaltyTier[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login?redirectTo=/profile'); return; }
      setEmail(user.email || '');

      /* Fetch profile + loyalty tiers in parallel */
      const [profileRes, tiersRes, ordersRes, vouchersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('loyalty_tiers').select('*').order('position'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_vouchers').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_used', false),
      ]);

      if (profileRes.data) {
        const row = profileRes.data as unknown as Profile;
        setProfile(row);
        setLastName(row.last_name || '');
        setFirstName(row.first_name || '');
        setUsername(row.username || '');
        setPhone(row.phone || '');
        setCccdNumber(row.cccd_number || '');
        setCccdFullName(row.cccd_full_name || '');
        if (row.birthday) {
          const parts = row.birthday.split('/');
          if (parts.length === 3) { setDay(parts[0]); setMonth(parts[1]); setYear(parts[2]); }
        }

        /* Resolve loyalty tier */
        const tiers = (tiersRes.data as unknown as LoyaltyTier[]) || [];
        setAllTiers(tiers);

        if (row.tier_id) {
          const found = tiers.find(t => t.id === row.tier_id);
          if (found) {
            setCurrentTier(found);
            const nextIdx = tiers.findIndex(t => t.id === row.tier_id) + 1;
            if (nextIdx < tiers.length) setNextTier(tiers[nextIdx]);
          }
        } else if (tiers.length > 0) {
          /* Default to first tier (Member) */
          setCurrentTier(tiers[0]);
          if (tiers.length > 1) setNextTier(tiers[1]);
        }
      }

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
      const { error } = await (
        supabase.from('profiles') as unknown as ProfileUpdateClient
      )
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          full_name: `${lastName.trim()} ${firstName.trim()}`.trim() || null,
          username: username.trim().toLowerCase() || null,
          phone: phone.trim() || null,
          birthday: bday,
          cccd_number: cccdNumber.trim() || null,
          cccd_full_name: cccdFullName.trim().toUpperCase() || null,
        } as ProfileUpdatePayload).eq('id', profile.id);
      
      if (error) throw error;
      setFeedback({ kind: 'success', message: 'Đã lưu thay đổi!' });
      setTimeout(() => setFeedback(null), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã có lỗi xảy ra.';
      setFeedback({ kind: 'error', message });
    } finally { setSaving(false); }
  };

  const startNfcVerification = async () => {
    setNfcScanning(true);
    setTimeout(async () => {
      try {
        await (supabase.from('profiles') as unknown as ProfileUpdateClient)
          .update({ verification_status: 'pending' })
          .eq('id', profile?.id ?? '');
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

  /* ── Loyalty progress calculation ── */
  const lifetimeSpend = profile?.lifetime_spend ?? 0;
  const loyaltyPoints = profile?.loyalty_points ?? 0;
  const progressPercent = nextTier
    ? Math.min(100, Math.round(((lifetimeSpend - (currentTier?.min_lifetime_spend ?? 0)) / (nextTier.min_lifetime_spend - (currentTier?.min_lifetime_spend ?? 0))) * 100))
    : 100;
  const spendRemaining = nextTier ? Math.max(0, nextTier.min_lifetime_spend - lifetimeSpend) : 0;

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
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name || 'Avatar'}
                    width={96}
                    height={96}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    unoptimized
                  />
                ) : (
                  <User />
                )}
                <label className={styles.camBtn}><Camera size={18} /><input type="file" hidden /></label>
              </div>
              <div className={styles.identityInfo}>
                <h2 className={styles.profileNameLarge}>{profile?.full_name || "Thành viên mới"}</h2>
                <p className={styles.profileEmailSub}>{email}</p>
                <div className={styles.quickBadges}>
                  {currentTier && (
                    <span
                      className={styles.roleBadge}
                      style={{
                        background: `linear-gradient(135deg, ${currentTier.badge_color}22, ${currentTier.badge_color}44)`,
                        color: currentTier.badge_color,
                        borderColor: `${currentTier.badge_color}66`,
                      }}
                    >
                      {TIER_ICONS[currentTier.name] || <Star size={16} />}
                      {currentTier.display_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.loyaltyStatsRow} style={{ marginTop: 'var(--space-5)', borderTop: '1px solid var(--color-border-light)', paddingTop: 'var(--space-5)' }}>
              <div className={styles.loyaltyStat}>
                <span className={styles.loyaltyStatValue}>{lifetimeSpend.toLocaleString('vi-VN')}₫</span>
                <span className={styles.loyaltyStatLabel}>Tổng chi tiêu</span>
              </div>
              <div className={styles.loyaltyStat}>
                <span className={styles.loyaltyStatValue}>{loyaltyPoints.toLocaleString('vi-VN')}</span>
                <span className={styles.loyaltyStatLabel}>Điểm tích lũy</span>
              </div>
              <div className={styles.loyaltyStat}>
                <span className={styles.loyaltyStatValue}>{currentTier?.discount_percent ?? 0}%</span>
                <span className={styles.loyaltyStatLabel}>Giảm giá hạng</span>
              </div>
            </div>
          </section>

          {/* ── Loyalty Progress ── */}
          <section className={styles.cleanCard}>
            <div className={styles.cardHeader}><TrendingUp size={20} /><h3>Lộ trình thăng hạng</h3></div>
            <div className={styles.loyaltySection}>
              <div className={styles.tierProgressWrap}>
                <div className={styles.tierSteps}>
                  {allTiers.map((tier, idx) => {
                    const isActive = currentTier?.id === tier.id;
                    const isPassed = (currentTier?.position ?? 0) > tier.position;
                    return (
                      <div key={tier.id} className={`${styles.tierStep} ${isActive ? styles.tierStepActive : ''} ${isPassed ? styles.tierStepPassed : ''}`}>
                        <div className={styles.tierDot} style={{ background: isActive || isPassed ? tier.badge_color : undefined, borderColor: tier.badge_color }}>
                          {TIER_ICONS[tier.name] || <Star size={12} />}
                        </div>
                        <span className={styles.tierStepLabel}>{tier.display_name.split(' (')[0]}</span>
                        {idx < allTiers.length - 1 && <div className={styles.tierConnector} style={{ background: isPassed ? 'var(--color-primary)' : undefined }} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {nextTier && (
                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <span>Tiến tới <strong style={{ color: nextTier.badge_color }}>{nextTier.display_name}</strong></span>
                    <span className={styles.progressPercent}>{progressPercent}%</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <motion.div className={styles.progressFill} initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} style={{ background: `linear-gradient(90deg, ${currentTier?.badge_color ?? '#8B7355'}, ${nextTier.badge_color})` }} />
                  </div>
                  <p className={styles.progressHint}>Chi tiêu thêm <strong>{spendRemaining.toLocaleString('vi-VN')}₫</strong> để lên hạng</p>
                </div>
              )}

              {currentTier?.perks && (
                <div className={styles.perksGrid}>
                  {Object.entries(currentTier.perks).map(([key, val]) => {
                    const perk = PERK_LABELS[key];
                    if (!perk || val === false) return null;
                    const label = key === 'freeShippingThreshold' ? (val === 0 ? 'Miễn phí vận chuyển' : `Freeship đơn từ ${Number(val).toLocaleString('vi-VN')}₫`) : perk.label;
                    return <div key={key} className={styles.perkItem}>{perk.icon} <span>{label}</span></div>;
                  })}
                </div>
              )}
            </div>
          </section>

          <section className={styles.cleanCard}>
            <div className={styles.cardHeader}><UserCheck size={20} /><h3>Thông tin tài khoản</h3></div>
            <div className={styles.cleanForm}>
              <div className={styles.cleanRow}>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Họ và tên đệm</label>
                  <input className={styles.cleanInput} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nhập họ..." /></div>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Tên</label>
                  <input className={styles.cleanInput} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Nhập tên..." /></div>
              </div>
              
              <div className={styles.cleanRow}>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Tên đăng nhập</label>
                  <input className={styles.cleanInput} value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="username" /></div>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Số điện thoại</label>
                  <div className={styles.inputWithIcon}><Smartphone size={16} /><input className={styles.cleanInput} value={phone} onChange={e => setPhone(e.target.value)} /></div></div>
              </div>

              <div className={styles.cleanRow}>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Ngày sinh</label>
                  <div className={styles.segmentedInput}>
                    <input ref={dayRef} className={styles.segment} value={day} placeholder="DD" maxLength={2} onChange={e => handleSegmentChange(e.target.value, 'day')} />
                    <span className={styles.divider}>/</span>
                    <input ref={monthRef} className={styles.segment} value={month} placeholder="MM" maxLength={2} onChange={e => handleSegmentChange(e.target.value, 'month')} />
                    <span className={styles.divider}>/</span>
                    <input ref={yearRef} className={`${styles.segment} ${styles.segmentYear}`} value={year} placeholder="YYYY" maxLength={4} onChange={e => handleSegmentChange(e.target.value, 'year')} />
                  </div>
                </div>
                <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Email (Cố định)</label>
                  <div className={styles.readonlyField}><Mail size={16} /> <span>{email}</span></div></div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border-light)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-5)' }}>
                <div className={styles.cardHeader} style={{ marginBottom: 'var(--space-4)' }}><Fingerprint size={18} /><h4>Định danh (CCCD)</h4></div>
                <div className={styles.cleanRow}>
                  <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Họ tên trên thẻ</label>
                    <input className={styles.cleanInput} value={cccdFullName} onChange={e => setCccdFullName(e.target.value.toUpperCase())} placeholder="NGUYEN VAN A" /></div>
                  <div className={styles.fieldGroup}><label className={styles.cleanLabel}>Số thẻ</label>
                    <input className={styles.cleanInput} value={cccdNumber} onChange={e => setCccdNumber(e.target.value)} placeholder="000..." /></div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.cleanCard}>
            <div className={styles.cardHeader}><ShoppingBag size={20} /><h3>Hoạt động</h3></div>
            <div className={styles.quickStatsGrid}>
              <button className={styles.statBoxLarge} onClick={() => router.push('/orders')}>
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
              <button className={styles.navItem} onClick={() => router.push('/profile/password')}><Fingerprint size={18} /> <span>Đổi mật khẩu</span> <ChevronRight size={14} /></button>
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
