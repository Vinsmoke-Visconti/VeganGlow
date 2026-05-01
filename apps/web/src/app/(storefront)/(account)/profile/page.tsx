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
  member: <Star size={16} />,
  silver: <Star size={16} />,
  gold: <Crown size={16} />,
  platinum: <Gem size={16} />,
  diamond: <Gem size={16} />,
};

const PERK_LABELS: Record<string, { icon: React.ReactNode; label: string }> = {
  freeShippingThreshold: { icon: <Truck size={14} />, label: 'Miễn phí vận chuyển' },
  birthdayGift: { icon: <Gift size={14} />, label: 'Quà tặng sinh nhật' },
  earlyAccess: { icon: <Zap size={14} />, label: 'Truy cập sớm sản phẩm mới' },
  personalShopper: { icon: <UserCheck size={14} />, label: 'Tư vấn cá nhân' },
  vipLounge: { icon: <Crown size={14} />, label: 'VIP Lounge' },
  exclusiveEvents: { icon: <Star size={14} />, label: 'Sự kiện độc quyền' },
};

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

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
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-primary">Tài khoản</span>
          <h1 className="font-serif text-3xl lg:text-5xl font-medium tracking-tight text-text mt-1">
            Hồ sơ cá nhân
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {profile?.verification_status === 'unverified' && (
            <>
              <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-secondary/10 text-secondary text-xs font-medium">
                <ShieldAlert size={14} /> Chưa xác thực
              </span>
              <button
                type="button"
                onClick={() => setIsNfcModalOpen(true)}
                className="h-9 px-4 rounded-full bg-text text-white text-xs font-medium hover:bg-primary-dark transition"
              >
                Xác thực ngay
              </button>
            </>
          )}
          {profile?.verification_status === 'pending' && (
            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary-50 text-primary text-xs font-medium">
              <Clock size={14} /> Đang chờ phê duyệt
            </span>
          )}
          {profile?.verification_status === 'verified' && (
            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-success/10 text-success text-xs font-medium">
              <BadgeCheck size={14} /> Đã xác thực
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <div className="flex flex-col gap-6">
          {/* Identity card */}
          <section className="rounded-2xl bg-bg-card border border-border-light p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-primary-50 grid place-items-center text-primary">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name || 'Avatar'}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User size={36} />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 grid place-items-center w-8 h-8 rounded-full bg-text text-white cursor-pointer hover:bg-primary-dark transition">
                  <Camera size={14} />
                  <input type="file" hidden />
                </label>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-2xl font-medium text-text">
                  {profile?.full_name || 'Thành viên mới'}
                </h2>
                <p className="text-sm text-text-muted mt-1 truncate">{email}</p>
                {currentTier && (
                  <span
                    className="inline-flex items-center gap-1.5 mt-3 h-8 px-3 rounded-full text-xs font-medium border"
                    style={{
                      background: `${currentTier.badge_color}1A`,
                      color: currentTier.badge_color,
                      borderColor: `${currentTier.badge_color}40`,
                    }}
                  >
                    {TIER_ICONS[currentTier.name] || <Star size={14} />}
                    {currentTier.display_name}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border-light">
              <div className="text-center sm:text-left">
                <div className="font-serif text-lg lg:text-xl font-semibold text-text">
                  {formatVND(lifetimeSpend)}
                </div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted mt-1">
                  Tổng chi tiêu
                </div>
              </div>
              <div className="text-center sm:text-left">
                <div className="font-serif text-lg lg:text-xl font-semibold text-text">
                  {loyaltyPoints.toLocaleString('vi-VN')}
                </div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted mt-1">
                  Điểm tích lũy
                </div>
              </div>
              <div className="text-center sm:text-left">
                <div className="font-serif text-lg lg:text-xl font-semibold text-text">
                  {currentTier?.discount_percent ?? 0}%
                </div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-text-muted mt-1">
                  Giảm giá hạng
                </div>
              </div>
            </div>
          </section>

          {/* Loyalty progress */}
          <section className="rounded-2xl bg-bg-card border border-border-light p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-primary" />
              <h3 className="font-serif text-lg font-medium text-text">Lộ trình thăng hạng</h3>
            </div>

            {/* Tier steps */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {allTiers.map((tier, idx) => {
                const isActive = currentTier?.id === tier.id;
                const isPassed = (currentTier?.position ?? 0) > tier.position;
                const colorOn = isActive || isPassed;
                return (
                  <div key={tier.id} className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="grid place-items-center w-9 h-9 rounded-full border-2"
                        style={{
                          background: colorOn ? tier.badge_color : 'transparent',
                          color: colorOn ? '#fff' : tier.badge_color,
                          borderColor: tier.badge_color,
                        }}
                      >
                        {TIER_ICONS[tier.name] || <Star size={12} />}
                      </div>
                      <span
                        className={`text-[11px] ${isActive ? 'font-medium text-text' : 'text-text-muted'}`}
                      >
                        {tier.display_name.split(' (')[0]}
                      </span>
                    </div>
                    {idx < allTiers.length - 1 && (
                      <div
                        className="h-0.5 w-10"
                        style={{ background: isPassed ? 'var(--color-primary)' : 'var(--color-border)' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {nextTier && (
              <div>
                <div className="flex items-center justify-between text-sm text-text-secondary mb-2">
                  <span>
                    Tiến tới{' '}
                    <span className="font-medium" style={{ color: nextTier.badge_color }}>
                      {nextTier.display_name}
                    </span>
                  </span>
                  <span className="font-medium text-text tabular-nums">{progressPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${progressPercent}%`,
                      background: `linear-gradient(90deg, ${currentTier?.badge_color ?? '#8B7355'}, ${nextTier.badge_color})`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  Chi tiêu thêm{' '}
                  <span className="font-medium text-text">{formatVND(spendRemaining)}</span> để lên
                  hạng
                </p>
              </div>
            )}

            {currentTier?.perks && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 pt-6 border-t border-border-light">
                {Object.entries(currentTier.perks).map(([key, val]) => {
                  const perk = PERK_LABELS[key];
                  if (!perk || val === false) return null;
                  const label =
                    key === 'freeShippingThreshold'
                      ? val === 0
                        ? 'Miễn phí vận chuyển'
                        : `Freeship đơn từ ${Number(val).toLocaleString('vi-VN')}₫`
                      : perk.label;
                  return (
                    <div
                      key={key}
                      className="inline-flex items-center gap-2 text-sm text-text-secondary"
                    >
                      <span className="text-primary">{perk.icon}</span>
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Account form */}
          <section className="rounded-2xl bg-bg-card border border-border-light p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-6">
              <UserCheck size={18} className="text-primary" />
              <h3 className="font-serif text-lg font-medium text-text">Thông tin tài khoản</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              <Field label="Họ và tên đệm">
                <input
                  className={inputCls}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nhập họ..."
                />
              </Field>
              <Field label="Tên">
                <input
                  className={inputCls}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nhập tên..."
                />
              </Field>
              <Field label="Tên đăng nhập">
                <input
                  className={inputCls}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="username"
                />
              </Field>
              <Field label="Số điện thoại">
                <input
                  className={inputCls}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0xxx..."
                />
              </Field>
              <Field label="Ngày sinh">
                <div className="flex items-center gap-2 h-11 px-4 rounded-lg border border-border bg-white focus-within:border-text">
                  <input
                    ref={dayRef}
                    className="w-8 text-center bg-transparent outline-none tabular-nums"
                    value={day}
                    placeholder="DD"
                    maxLength={2}
                    onChange={(e) => handleSegmentChange(e.target.value, 'day')}
                  />
                  <span className="text-text-muted">/</span>
                  <input
                    ref={monthRef}
                    className="w-8 text-center bg-transparent outline-none tabular-nums"
                    value={month}
                    placeholder="MM"
                    maxLength={2}
                    onChange={(e) => handleSegmentChange(e.target.value, 'month')}
                  />
                  <span className="text-text-muted">/</span>
                  <input
                    ref={yearRef}
                    className="w-12 text-center bg-transparent outline-none tabular-nums"
                    value={year}
                    placeholder="YYYY"
                    maxLength={4}
                    onChange={(e) => handleSegmentChange(e.target.value, 'year')}
                  />
                </div>
              </Field>
              <Field label="Email (Cố định)">
                <div className="flex items-center gap-2 h-11 px-4 rounded-lg border border-border-light bg-bg-secondary text-text-secondary text-sm">
                  <Mail size={14} className="text-text-muted shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
              </Field>
            </div>

            <div className="mt-8 pt-6 border-t border-border-light">
              <div className="flex items-center gap-2 mb-4">
                <Fingerprint size={18} className="text-primary" />
                <h4 className="font-serif text-base font-medium text-text">Định danh CCCD</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                <Field label="Họ tên trên thẻ">
                  <input
                    className={inputCls}
                    value={cccdFullName}
                    onChange={(e) => setCccdFullName(e.target.value.toUpperCase())}
                    placeholder="NGUYEN VAN A"
                  />
                </Field>
                <Field label="Số thẻ">
                  <input
                    className={inputCls}
                    value={cccdNumber}
                    onChange={(e) => setCccdNumber(e.target.value)}
                    placeholder="000..."
                  />
                </Field>
              </div>
            </div>
          </section>
        </div>

        {/* Side column */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl bg-bg-card border border-border-light p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag size={18} className="text-primary" />
              <h3 className="font-serif text-base font-medium text-text">Hoạt động</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="rounded-xl bg-bg-secondary p-4 text-left hover:bg-primary-50 transition"
              >
                <div className="font-serif text-2xl font-semibold text-text tabular-nums">
                  {orderCount}
                </div>
                <div className="text-xs text-text-muted mt-1">Đơn hàng</div>
              </button>
              <button
                type="button"
                onClick={() => router.push('/vouchers')}
                className="rounded-xl bg-bg-secondary p-4 text-left hover:bg-primary-50 transition"
              >
                <div className="font-serif text-2xl font-semibold text-text tabular-nums">
                  {voucherCount}
                </div>
                <div className="text-xs text-text-muted mt-1">Voucher</div>
              </button>
            </div>

            <nav className="flex flex-col">
              {[
                { icon: <MapPin size={16} />, label: 'Sổ địa chỉ', href: '/profile/address' },
                { icon: <CreditCard size={16} />, label: 'Ngân hàng', href: '/profile/bank' },
                { icon: <Fingerprint size={16} />, label: 'Đổi mật khẩu', href: '/profile/password' },
                { icon: <Ticket size={16} />, label: 'Kho voucher', href: '/vouchers' },
              ].map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className="flex items-center gap-3 py-3 border-b border-border-light last:border-b-0 text-sm text-text-secondary hover:text-text transition"
                >
                  <span className="text-primary">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRight size={14} className="text-text-muted" />
                </button>
              ))}
            </nav>
          </section>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="h-12 rounded-full bg-text text-white font-medium tracking-tight inline-flex items-center justify-center gap-2 hover:bg-primary-dark transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Cập nhật hồ sơ'}
          </button>
        </aside>
      </div>

      {/* NFC modal */}
      {isNfcModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 grid place-items-center px-4"
          onClick={() => setIsNfcModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-bg-card p-6 lg:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-medium text-text">Xác thực thông minh</h3>
              <button
                type="button"
                onClick={() => setIsNfcModalOpen(false)}
                className="grid place-items-center w-9 h-9 rounded-full hover:bg-primary-50"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="text-center py-4">
              {nfcScanning ? (
                <>
                  <div className="inline-grid place-items-center w-20 h-20 rounded-full bg-primary-50 text-primary mb-4">
                    <Cpu size={36} className="animate-spin" />
                  </div>
                  <h4 className="font-serif text-lg font-medium text-text">Đang kết nối chip NFC</h4>
                  <p className="text-sm text-text-secondary mt-2">
                    Vui lòng giữ thẻ CCCD sát mặt lưng thiết bị
                  </p>
                </>
              ) : (
                <>
                  <div className="inline-grid place-items-center w-20 h-20 rounded-full bg-primary-50 text-primary mb-4">
                    <Cpu size={36} />
                  </div>
                  <h4 className="font-serif text-lg font-medium text-text">Xác thực thực tế</h4>
                  <p className="text-sm text-text-secondary mt-2 max-w-xs mx-auto">
                    Hệ thống sẽ đối soát dữ liệu sinh trắc học và chip trên thẻ CCCD.
                  </p>
                  <button
                    type="button"
                    onClick={startNfcVerification}
                    className="mt-6 w-full h-12 rounded-full bg-text text-white font-medium hover:bg-primary-dark transition"
                  >
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
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-sm font-medium z-50 ${
            feedback.kind === 'success' ? 'bg-success text-white' : 'bg-error text-white'
          }`}
        >
          {feedback.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {feedback.message}
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full h-11 px-4 rounded-lg border border-border bg-white text-sm text-text placeholder:text-text-muted focus:border-text focus:outline-none transition';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">{label}</span>
      {children}
    </label>
  );
}
