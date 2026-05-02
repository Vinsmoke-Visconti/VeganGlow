'use client';

import { createBrowserClient } from '@/lib/supabase/client';
import Image from 'next/image';
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
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

const TIER_ICONS: Record<string, React.ReactNode> = {
  member: <Star size={14} />,
  silver: <Star size={14} />,
  gold: <Crown size={14} />,
  platinum: <Gem size={14} />,
  diamond: <Gem size={14} />,
};

const PERK_LABELS: Record<string, { icon: React.ReactNode; label: string }> = {
  freeShippingThreshold: { icon: <Truck size={14} />, label: 'Miễn phí vận chuyển' },
  birthdayGift: { icon: <Gift size={14} />, label: 'Quà tặng sinh nhật' },
  earlyAccess: { icon: <Zap size={14} />, label: 'Truy cập sớm' },
  personalShopper: { icon: <UserCheck size={14} />, label: 'Tư vấn cá nhân' },
  vipLounge: { icon: <Crown size={14} />, label: 'VIP Lounge' },
  exclusiveEvents: { icon: <Star size={14} />, label: 'Sự kiện độc quyền' },
};

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.cleanLabel}>{label}</label>
      {children}
    </div>
  );
}

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

  const [currentTier, setCurrentTier] = useState<LoyaltyTier | null>(null);
  const [nextTier, setNextTier] = useState<LoyaltyTier | null>(null);
  const [allTiers, setAllTiers] = useState<LoyaltyTier[]>([]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?redirectTo=/profile');
        return;
      }
      setEmail(user.email || '');

      const [profileRes, tiersRes, ordersRes, vouchersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('loyalty_tiers').select('*').order('position'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase
          .from('user_vouchers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_used', false),
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
          if (parts.length === 3) {
            setDay(parts[0]);
            setMonth(parts[1]);
            setYear(parts[2]);
          }
        }

        const tiers = (tiersRes.data as unknown as LoyaltyTier[]) || [];
        setAllTiers(tiers);

        if (row.tier_id) {
          const found = tiers.find((t) => t.id === row.tier_id);
          if (found) {
            setCurrentTier(found);
            const nextIdx = tiers.findIndex((t) => t.id === row.tier_id) + 1;
            if (nextIdx < tiers.length) setNextTier(tiers[nextIdx]);
          }
        } else if (tiers.length > 0) {
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
    const bday = day && month && year ? `${day}/${month}/${year}` : null;
    try {
      const { error } = await (supabase.from('profiles') as unknown as ProfileUpdateClient)
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          full_name: `${lastName.trim()} ${firstName.trim()}`.trim() || null,
          username: username.trim().toLowerCase() || null,
          phone: phone.trim() || null,
          birthday: bday,
          cccd_number: cccdNumber.trim() || null,
          cccd_full_name: cccdFullName.trim().toUpperCase() || null,
        } as ProfileUpdatePayload)
        .eq('id', profile.id);

      if (error) throw error;
      setFeedback({ kind: 'success', message: 'Đã lưu thay đổi!' });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã có lỗi xảy ra.';
      setFeedback({ kind: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const startNfcVerification = async () => {
    setNfcScanning(true);
    setTimeout(async () => {
      try {
        await (supabase.from('profiles') as unknown as ProfileUpdateClient)
          .update({ verification_status: 'pending' })
          .eq('id', profile?.id ?? '');
        setProfile((prev) => (prev ? { ...prev, verification_status: 'pending' } : null));
        setIsNfcModalOpen(false);
        setFeedback({ kind: 'success', message: 'Hồ sơ đang chờ duyệt!' });
        setTimeout(() => setFeedback(null), 2500);
      } catch (err) {
        console.error(err);
      } finally {
        setNfcScanning(false);
      }
    }, 3000);
  };

  const handleSegmentChange = (val: string, segment: 'day' | 'month' | 'year') => {
    const numeric = val.replace(/\D/g, '');
    if (segment === 'day') {
      if (numeric.length <= 2) {
        setDay(numeric);
        if (numeric.length === 2) monthRef.current?.focus();
      }
    } else if (segment === 'month') {
      if (numeric.length <= 2) {
        setMonth(numeric);
        if (numeric.length === 2) yearRef.current?.focus();
      }
    } else if (segment === 'year') {
      if (numeric.length <= 4) setYear(numeric);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, segment: 'day' | 'month' | 'year') => {
    if (e.key === 'Backspace') {
      if (segment === 'month' && !month) {
        dayRef.current?.focus();
      } else if (segment === 'year' && !year) {
        monthRef.current?.focus();
      }
    }
  };

  const lifetimeSpend = profile?.lifetime_spend ?? 0;
  const loyaltyPoints = profile?.loyalty_points ?? 0;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.round(
          ((lifetimeSpend - (currentTier?.min_lifetime_spend ?? 0)) /
            (nextTier.min_lifetime_spend - (currentTier?.min_lifetime_spend ?? 0))) *
            100,
        ),
      )
    : 100;
  const spendRemaining = nextTier ? Math.max(0, nextTier.min_lifetime_spend - lifetimeSpend) : 0;

  if (loading) {
    return <div className={styles.loaderContainer}><Loader2 className={styles.spin} size={28} /></div>;
  }

  return (
    <div className={styles.profileWrapper}>
      <header className={styles.cleanHeader}>
        <div className={styles.headerLeft}>
          <h1>Hồ sơ cá nhân</h1>
        </div>
        <div className={styles.headerStatus}>
          {profile?.verification_status === 'unverified' && (
            <>
              <span className={`${styles.statusTag} ${styles.unverifiedTag}`}>
                <ShieldAlert size={14} /> Chưa xác thực
              </span>
              <button className={styles.quickVerifyBtn} onClick={() => setIsNfcModalOpen(true)}>
                Xác thực ngay
              </button>
            </>
          )}
          {profile?.verification_status === 'pending' && (
            <span className={`${styles.statusTag} ${styles.pendingTag}`}>
              <Clock size={14} /> Chờ phê duyệt
            </span>
          )}
          {profile?.verification_status === 'verified' && (
            <span className={`${styles.statusTag} ${styles.verifiedTag}`}>
              <BadgeCheck size={14} /> Đã xác thực
            </span>
          )}
        </div>
      </header>

      <div className={styles.cleanGrid}>
        <div>
          <section className={styles.cleanCard}>
            <div className={styles.identityFlex}>
              <div className={styles.avatarInner}>
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt="Avatar" width={96} height={96} unoptimized />
                ) : (
                  <User size={40} />
                )}
                <label className={styles.camBtn}>
                  <Camera size={14} />
                  <input type="file" hidden />
                </label>
              </div>
              <div className={styles.identityInfo}>
                <h2 className={styles.profileNameLarge}>{profile?.full_name || 'Thành viên mới'}</h2>
                <div className={styles.profileEmailSub}>{email}</div>
                <div className={styles.quickBadges}>
                  {currentTier && (
                    <div
                      className={styles.roleBadge}
                      style={{ color: currentTier.badge_color, borderColor: currentTier.badge_color, background: `${currentTier.badge_color}10` }}
                    >
                      {TIER_ICONS[currentTier.name] || <Star size={14} />}
                      {currentTier.display_name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border-light)' }}>
              <div className={styles.loyaltyStatsRow}>
                <div className={styles.loyaltyStat}>
                  <div className={styles.loyaltyStatValue}>{formatVND(lifetimeSpend)}</div>
                  <div className={styles.loyaltyStatLabel}>Tổng chi tiêu</div>
                </div>
                <div className={styles.loyaltyStat}>
                  <div className={styles.loyaltyStatValue}>{loyaltyPoints.toLocaleString('vi-VN')}</div>
                  <div className={styles.loyaltyStatLabel}>Điểm tích lũy</div>
                </div>
                <div className={styles.loyaltyStat}>
                  <div className={styles.loyaltyStatValue}>{currentTier?.discount_percent ?? 0}%</div>
                  <div className={styles.loyaltyStatLabel}>Giảm giá hạng</div>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.cleanCard}>
            <div className={styles.cardHeader}>
              <TrendingUp size={20} />
              <h3>Lộ trình thăng hạng</h3>
            </div>
            
            <div className={styles.loyaltySection}>
              <div className={styles.tierProgressWrap}>
                <div className={styles.tierSteps}>
                  {allTiers.map((tier, idx) => {
                    const isActive = currentTier?.id === tier.id;
                    const isPassed = (currentTier?.position ?? 0) > tier.position;
                    const stepClass = isActive ? styles.tierStepActive : isPassed ? styles.tierStepPassed : '';
                    return (
                      <div key={tier.id} className={`${styles.tierStep} ${stepClass}`}>
                        <div className={styles.tierDot} style={isActive || isPassed ? { background: tier.badge_color } : {}}>
                          {TIER_ICONS[tier.name] || <Star size={14} />}
                        </div>
                        <div className={styles.tierStepLabel}>{tier.display_name.split(' (')[0]}</div>
                        {idx < allTiers.length - 1 && (
                          <div className={styles.tierConnector} style={isPassed ? { background: `linear-gradient(90deg, ${tier.badge_color}, ${allTiers[idx + 1].badge_color})` } : {}} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {nextTier ? (
                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <span>Tiến tới <strong style={{ color: nextTier.badge_color }}>{nextTier.display_name.split(' (')[0]}</strong></span>
                    <span className={styles.progressPercent}>{progressPercent}%</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, ${currentTier?.badge_color ?? '#8B7355'}, ${nextTier.badge_color})` }} />
                  </div>
                  <div className={styles.progressHint}>
                    Chi tiêu thêm <strong>{formatVND(spendRemaining)}</strong> để lên hạng tiếp theo
                  </div>
                </div>
              ) : (
                <div className={styles.maxTierMsg}>
                  Bạn đã đạt hạng cao nhất! Cảm ơn bạn đã luôn đồng hành cùng VeganGlow.
                </div>
              )}

              {currentTier?.perks && (
                <div className={styles.perksGrid}>
                  {Object.entries(currentTier.perks).map(([key, val]) => {
                    const perk = PERK_LABELS[key];
                    if (!perk || val === false) return null;
                    const label = key === 'freeShippingThreshold' ? (val === 0 ? 'Miễn phí vận chuyển' : `Freeship đơn từ ${Number(val).toLocaleString('vi-VN')}₫`) : perk.label;
                    return (
                      <div key={key} className={styles.perkItem}>
                        {perk.icon} <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className={styles.cleanCard}>
            <div className={styles.cardHeader}>
              <UserCheck size={20} />
              <h3>Thông tin tài khoản</h3>
            </div>
            
            <div className={styles.cleanForm}>
              <div className={styles.cleanRow}>
                <Field label="Họ và tên đệm">
                  <input className={styles.cleanInput} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nhập họ..." />
                </Field>
                <Field label="Tên">
                  <input className={styles.cleanInput} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nhập tên..." />
                </Field>
              </div>
              <div className={styles.cleanRow}>
                <Field label="Tên đăng nhập">
                  <input className={styles.cleanInput} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="username" />
                </Field>
                <Field label="Số điện thoại">
                  <input className={styles.cleanInput} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0xxx..." type="tel" />
                </Field>
              </div>
              <div className={styles.cleanRow}>
                <Field label="Ngày sinh">
                  <div className={styles.segmentedInput}>
                    <input 
                      ref={dayRef} 
                      className={styles.segment} 
                      value={day} 
                      placeholder="DD" 
                      maxLength={2} 
                      onChange={(e) => handleSegmentChange(e.target.value, 'day')} 
                      onKeyDown={(e) => handleKeyDown(e, 'day')}
                    />
                    <span className={styles.divider}>/</span>
                    <input 
                      ref={monthRef} 
                      className={styles.segment} 
                      value={month} 
                      placeholder="MM" 
                      maxLength={2} 
                      onChange={(e) => handleSegmentChange(e.target.value, 'month')} 
                      onKeyDown={(e) => handleKeyDown(e, 'month')}
                    />
                    <span className={styles.divider}>/</span>
                    <input 
                      ref={yearRef} 
                      className={`${styles.segment} ${styles.segmentYear}`} 
                      value={year} 
                      placeholder="YYYY" 
                      maxLength={4} 
                      onChange={(e) => handleSegmentChange(e.target.value, 'year')} 
                      onKeyDown={(e) => handleKeyDown(e, 'year')}
                    />
                  </div>
                </Field>
                <Field label="Email (Cố định)">
                  <div className={styles.readonlyField}>
                    <Mail size={14} /> {email}
                  </div>
                </Field>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border-light)' }}>
                <div className={styles.cardHeader} style={{ marginBottom: '1rem' }}>
                  <Fingerprint size={18} />
                  <h4>Định danh CCCD</h4>
                </div>
                <div className={styles.cleanRow}>
                  <Field label="Họ tên trên thẻ">
                    <input className={styles.cleanInput} value={cccdFullName} onChange={(e) => setCccdFullName(e.target.value.toUpperCase())} placeholder="NGUYEN VAN A" />
                  </Field>
                  <Field label="Số thẻ">
                    <input className={styles.cleanInput} value={cccdNumber} onChange={(e) => setCccdNumber(e.target.value)} placeholder="000..." type="numeric" />
                  </Field>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside>
          <section className={styles.cleanCard} style={{ position: 'sticky', top: '2rem' }}>
            <div className={styles.cardHeader} style={{ marginBottom: '1rem' }}>
              <ShoppingBag size={18} />
              <h4>Hoạt động</h4>
            </div>
            <div className={styles.quickStatsGrid}>
              <div className={styles.statBoxLarge} onClick={() => router.push('/orders')}>
                <div className={styles.statVal}>{orderCount}</div>
                <p>ĐƠN HÀNG</p>
              </div>
              <div className={styles.statBoxLarge} onClick={() => router.push('/vouchers')}>
                <div className={styles.statVal}>{voucherCount}</div>
                <p>VOUCHER</p>
              </div>
            </div>

            <button 
              className={styles.mainSaveBtn} 
              onClick={handleSaveAll}
              disabled={saving}
              style={{ marginTop: '1rem' }}
            >
              {saving ? <Loader2 size={18} className={styles.spin} style={{ display: 'inline' }} /> : 'Cập nhật hồ sơ'}
            </button>
          </section>
        </aside>
      </div>

      {/* NFC modal */}
      {isNfcModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsNfcModalOpen(false)}>
          <div className={styles.kycModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Xác thực thông minh</h3>
              <button className={styles.closeModal} onClick={() => setIsNfcModalOpen(false)}><X size={16} /></button>
            </div>
            <div className={styles.kycContent}>
              {nfcScanning ? (
                <>
                  <div className={styles.nfcPulse}><Cpu size={36} color="var(--color-primary)" /></div>
                  <h4>Đang kết nối chip NFC</h4>
                  <p>Vui lòng giữ thẻ CCCD sát mặt lưng thiết bị</p>
                </>
              ) : (
                <>
                  <div className={styles.nfcPulse} style={{ animation: 'none' }}><Cpu size={36} color="var(--color-primary)" /></div>
                  <h4>Xác thực thực tế</h4>
                  <p>Hệ thống sẽ đối soát dữ liệu sinh trắc học và chip trên thẻ CCCD.</p>
                  <button className={styles.mainSaveBtn} style={{ marginTop: '1.5rem' }} onClick={startNfcVerification}>
                    Bắt đầu quét
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {feedback && (
        <div className={`${styles.toast} ${styles[feedback.kind]}`}>
          {feedback.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {feedback.message}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div
      className={`text-center sm:text-left px-1 ${
        divider ? 'sm:border-x sm:border-white/40 sm:px-4' : ''
      }`}
    >
      <div className="font-serif text-base sm:text-xl font-semibold text-text leading-tight tabular-nums">
        {value}
      </div>
      <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-text-secondary mt-1.5">
        {label}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-10 lg:py-14 motion-safe:animate-pulse">
      <div className="mb-10 pb-6 border-b border-border-light">
        <div className="h-3 w-32 rounded bg-bg-secondary mb-3" />
        <div className="h-10 w-72 rounded bg-bg-secondary mb-3" />
        <div className="h-4 w-96 max-w-full rounded bg-bg-secondary" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8">
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl bg-bg-secondary h-56" />
          <div className="rounded-3xl bg-bg-secondary h-64" />
          <div className="rounded-3xl bg-bg-secondary h-96" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="rounded-3xl bg-bg-secondary h-80" />
          <div className="rounded-full bg-bg-secondary h-12" />
        </div>
      </div>
    </div>
  );
}
