'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  User,
  Lock,
  Activity,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Pencil,
  Camera,
  LogIn,
  Package,
  ShoppingBag,
  Settings as SettingsIcon,
} from 'lucide-react';
import sharedStyles from '../admin-shared.module.css';
import styles from './profile.module.css';

type Tab = 'info' | 'security' | 'activity';

type StaffProfile = {
  id: string;
  full_name: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  role_id: string;
  department: string | null;
  position: string | null;
  bio: string | null;
  roles: { name: string; display_name: string } | null;
};

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'info', icon: <User size={16} />, label: 'Thông tin' },
  { id: 'security', icon: <Lock size={16} />, label: 'Bảo mật' },
  { id: 'activity', icon: <Activity size={16} />, label: 'Hoạt động' },
];

const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

export default function AdminProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient();

  const initialTab = (searchParams.get('tab') as Tab) || 'info';
  const [tab, setTab] = useState<Tab>(initialTab);

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/admin/login');
        return;
      }

      const { data, error } = await supabase
        .from('staff_profiles')
        .select(
          'id, full_name, username, first_name, last_name, email, phone, avatar_url, is_active, last_login_at, created_at, role_id, department, position, bio, roles:role_id(name, display_name)',
        )
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Lỗi tải hồ sơ:', error);
      }
      if (alive) {
        setProfile((data as unknown as StaffProfile) || null);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router, supabase]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !profile) return;

      if (file.size > 1024 * 1024) {
        alert('Dung lượng file quá lớn (tối đa 1MB).');
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

      const { error: updateError } = await (supabase.from('staff_profiles') as any)
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      
      // Audit log
      await supabase.rpc('log_admin_action' as any, {
        p_action: 'update',
        p_entity: 'staff_profile',
        p_summary: 'Cập nhật ảnh đại diện',
        p_entity_id: profile.id,
      } as any).then(() => undefined, () => undefined);

    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className={sharedStyles.page}>
        <div className={sharedStyles.card}>
          <div className={sharedStyles.loadingState}>
            <Loader2 className="animate-spin" size={22} />
            Đang tải hồ sơ...
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={sharedStyles.page}>
        <div className={sharedStyles.card}>
          <div className={sharedStyles.emptyState}>
            Không tìm thấy hồ sơ nhân sự. Liên hệ Super Admin để được hỗ trợ.
          </div>
        </div>
      </div>
    );
  }

  const initial = (profile.full_name || profile.email).charAt(0).toUpperCase();
  const memberSince = new Date(profile.created_at).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const lastLogin = profile.last_login_at
    ? new Date(profile.last_login_at).toLocaleString('vi-VN')
    : 'Chưa có dữ liệu';

  return (
    <div className={sharedStyles.page}>
      <header className={sharedStyles.pageHeader}>
        <div>
          <h1 className={sharedStyles.pageTitle}>Hồ sơ của tôi</h1>
          <p className={sharedStyles.pageSubtitle}>
            Quản lý thông tin cá nhân và bảo mật tài khoản nhân sự.
          </p>
        </div>
      </header>

      {/* Hero card */}
      <section className={styles.hero}>
        <div className={styles.heroBackdrop} aria-hidden="true" />
        <div className={styles.heroContent}>
          <div className={styles.avatarWrap}>
            {uploading ? (
              <div className={styles.avatarFallback}><Loader2 className="animate-spin" size={24} /></div>
            ) : profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>{initial}</div>
            )}
            <label
              className={styles.avatarEdit}
              aria-label="Đổi ảnh đại diện"
              style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
            >
              <Pencil size={12} />
              <input 
                type="file" 
                accept="image/png, image/jpeg" 
                onChange={handleAvatarUpload} 
                style={{ display: 'none' }} 
                disabled={uploading}
              />
            </label>
          </div>

          <div className={styles.heroInfo}>
            <h2 className={styles.heroName}>{profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Chưa đặt tên'}</h2>
            <p className={styles.heroUsername}>@{profile.username || 'user'}</p>

            <div className={styles.heroMeta}>
              <span className={styles.heroMetaItem}>
                <Mail size={14} /> {profile.email}
              </span>
              {profile.phone && (
                <span className={styles.heroMetaItem}>
                  <Phone size={14} /> {profile.phone}
                </span>
              )}
            </div>

            <div className={styles.heroBadges}>
              <span className={`${sharedStyles.badge} ${sharedStyles.badgeInfo}`}>
                <Shield size={11} />
                {profile.roles?.display_name || 'Nhân sự'}
              </span>
              <span
                className={`${sharedStyles.badge} ${
                  profile.is_active ? sharedStyles.badgeSuccess : sharedStyles.badgeDanger
                }`}
              >
                {profile.is_active ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                {profile.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
              </span>
            </div>
          </div>

          <div className={styles.heroSide}>
            <div className={styles.heroSideRow}>
              <Calendar size={13} />
              <span>Tham gia: <strong>{memberSince}</strong></span>
            </div>
            <div className={styles.heroSideRow}>
              <Clock size={13} />
              <span>Đăng nhập gần nhất: <strong>{lastLogin}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && <InfoTab profile={profile} setProfile={setProfile} />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'activity' && <ActivityTab />}
    </div>
  );
}

/* ──────────────── Info Tab ──────────────── */

function InfoTab({
  profile,
  setProfile,
}: {
  profile: StaffProfile;
  setProfile: (p: StaffProfile) => void;
}) {
  const supabase = createBrowserClient();
  const [username, setUsername] = useState(profile.username || '');
  const [firstName, setFirstName] = useState(profile.first_name || '');
  const [lastName, setLastName] = useState(profile.last_name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [department, setDepartment] = useState(profile.department || '');
  const [position, setPosition] = useState(profile.position || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const dirty =
    username !== (profile.username || '') ||
    firstName !== (profile.first_name || '') ||
    lastName !== (profile.last_name || '') ||
    phone !== (profile.phone || '') ||
    department !== (profile.department || '') ||
    position !== (profile.position || '') ||
    bio !== (profile.bio || '');

  const onSave = async () => {
    setFeedback(null);

    if (!username.trim()) {
      setFeedback({ kind: 'err', msg: 'Vui lòng nhập tên đăng nhập.' });
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setFeedback({ kind: 'err', msg: 'Vui lòng nhập đầy đủ họ và tên.' });
      return;
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      setFeedback({ kind: 'err', msg: 'Số điện thoại không hợp lệ (VD: 0901234567).' });
      return;
    }

    setSaving(true);
    const updates = {
      username: username.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${lastName.trim()} ${firstName.trim()}`,
      phone: phone.trim() || null,
      department: department.trim() || null,
      position: position.trim() || null,
      bio: bio.trim() || null,
    };
    const { error } = await (supabase.from('staff_profiles') as any)
      .update(updates)
      .eq('id', profile.id);

    if (!error) {
      // Best-effort audit log — don't block UI if it fails
      await supabase.rpc('log_admin_action' as any, {
        p_action: 'update',
        p_entity: 'staff_profile',
        p_summary: 'Cập nhật hồ sơ cá nhân',
        p_entity_id: profile.id,
      } as any).then(() => undefined, () => undefined);
    }

    setSaving(false);
    if (error) {
      setFeedback({ kind: 'err', msg: 'Lỗi: ' + error.message });
      return;
    }
    setProfile({ ...profile, ...updates });
    setFeedback({ kind: 'ok', msg: 'Đã cập nhật hồ sơ thành công.' });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Thông tin cá nhân</h3>
        <p className={styles.panelDesc}>Cập nhật tên và liên hệ — email và vai trò do Super Admin quản lý.</p>
      </div>

      {feedback && (
        <div
          className={`${styles.feedback} ${feedback.kind === 'ok' ? styles.feedbackOk : styles.feedbackErr}`}
        >
          {feedback.kind === 'ok' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {feedback.msg}
        </div>
      )}

      <div className={styles.formGrid}>
        <Field label="Tên đăng nhập" required>
          <input
            type="text"
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="VD: terrykozte"
            maxLength={50}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', gridColumn: 'span 2' }}>
          <Field label="Họ" required>
            <input
              type="text"
              className={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="VD: Nguyễn"
            />
          </Field>
          <Field label="Tên" required>
            <input
              type="text"
              className={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="VD: Văn A"
            />
          </Field>
        </div>

        <Field label="Số điện thoại">
          <input
            type="tel"
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="VD: 0901234567"
          />
        </Field>

        <Field label="Email" hint="Liên hệ Super Admin nếu cần thay đổi">
          <input
            type="email"
            className={`${styles.input} ${styles.inputReadonly}`}
            value={profile.email}
            readOnly
            disabled
          />
        </Field>

        <Field label="Vai trò" hint="Chỉ Super Admin được thay đổi">
          <input
            type="text"
            className={`${styles.input} ${styles.inputReadonly}`}
            value={profile.roles?.display_name || 'Nhân sự'}
            readOnly
            disabled
          />
        </Field>

        <Field label="Phòng ban">
          <input
            type="text"
            className={styles.input}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="VD: Vận hành / Marketing / CS"
          />
        </Field>

        <Field label="Vị trí">
          <input
            type="text"
            className={styles.input}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="VD: Trưởng phòng vận hành"
          />
        </Field>

        <Field label="Bio / Ghi chú nội bộ" full>
          <textarea
            className={styles.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Giới thiệu ngắn về bạn — hiển thị cho đồng nghiệp."
            maxLength={300}
          />
        </Field>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={sharedStyles.btnPrimary}
          onClick={onSave}
          disabled={saving || !dirty}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
}

/* ──────────────── Security Tab ──────────────── */

function SecurityTab() {
  const supabase = createBrowserClient();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const passwordStrength = (() => {
    if (!next) return { score: 0, label: '', color: '' };
    let score = 0;
    if (next.length >= 8) score += 1;
    if (/[A-Z]/.test(next)) score += 1;
    if (/[0-9]/.test(next)) score += 1;
    if (/[^A-Za-z0-9]/.test(next)) score += 1;
    const label = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'][score] || 'Rất yếu';
    const color = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'][score] || '#ef4444';
    return { score, label, color };
  })();

  const onChangePw = async () => {
    setFeedback(null);

    if (next.length < 8) {
      setFeedback({ kind: 'err', msg: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
      return;
    }
    if (next !== confirm) {
      setFeedback({ kind: 'err', msg: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: next });
    setSaving(false);

    if (error) {
      setFeedback({ kind: 'err', msg: 'Lỗi: ' + error.message });
      return;
    }
    setCurrent('');
    setNext('');
    setConfirm('');
    setFeedback({ kind: 'ok', msg: 'Đã đổi mật khẩu thành công.' });
  };

  return (
    <div className={styles.panelStack}>
      {/* Change password */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Đổi mật khẩu</h3>
          <p className={styles.panelDesc}>Mật khẩu mạnh giúp bảo vệ dữ liệu khách hàng.</p>
        </div>

        {feedback && (
          <div
            className={`${styles.feedback} ${feedback.kind === 'ok' ? styles.feedbackOk : styles.feedbackErr}`}
          >
            {feedback.kind === 'ok' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {feedback.msg}
          </div>
        )}

        <div className={styles.formGrid}>
          <Field label="Mật khẩu hiện tại" full>
            <div className={styles.inputWrap}>
              <input
                type={showPw ? 'text' : 'password'}
                className={styles.input}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.inputAddon}
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label="Mật khẩu mới" required>
            <input
              type={showPw ? 'text' : 'password'}
              className={styles.input}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
            {next && (
              <div className={styles.pwStrength}>
                <div className={styles.pwStrengthBar}>
                  <div
                    className={styles.pwStrengthFill}
                    style={{
                      width: `${(passwordStrength.score / 4) * 100}%`,
                      background: passwordStrength.color,
                    }}
                  />
                </div>
                <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
              </div>
            )}
          </Field>

          <Field label="Xác nhận mật khẩu mới" required>
            <input
              type={showPw ? 'text' : 'password'}
              className={styles.input}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={sharedStyles.btnPrimary}
            onClick={onChangePw}
            disabled={saving || !next || !confirm}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            {saving ? 'Đang đổi...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </div>

      {/* 2FA placeholder */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Xác thực 2 lớp (2FA)</h3>
          <p className={styles.panelDesc}>Tăng cường bảo mật bằng mã OTP qua app xác thực.</p>
        </div>
        <div className={styles.featureRow}>
          <div className={styles.featureIcon}>
            <Shield size={20} />
          </div>
          <div className={styles.featureBody}>
            <div className={styles.featureTitle}>Authenticator (Google / Microsoft / Authy)</div>
            <div className={styles.featureDesc}>Chưa kích hoạt</div>
          </div>
          <button
            type="button"
            className={sharedStyles.btnOutline}
            onClick={() => alert('Tính năng 2FA đang phát triển')}
          >
            Kích hoạt
          </button>
        </div>
      </div>

      {/* Sessions placeholder */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Phiên đăng nhập</h3>
          <p className={styles.panelDesc}>Các thiết bị đang đăng nhập tài khoản này.</p>
        </div>
        <div className={styles.sessionList}>
          <div className={styles.sessionItem}>
            <div className={styles.sessionBadge} title="Phiên hiện tại" />
            <div className={styles.sessionInfo}>
              <div className={styles.sessionTitle}>Chrome trên Windows · TP.HCM</div>
              <div className={styles.sessionMeta}>Phiên hiện tại · Đang hoạt động</div>
            </div>
            <span className={`${sharedStyles.badge} ${sharedStyles.badgeSuccess}`}>Hiện tại</span>
          </div>
          <div className={styles.sessionItem}>
            <div className={`${styles.sessionBadge} ${styles.sessionBadgeIdle}`} />
            <div className={styles.sessionInfo}>
              <div className={styles.sessionTitle}>Safari trên iPhone</div>
              <div className={styles.sessionMeta}>3 ngày trước · TP.HCM</div>
            </div>
            <button className={sharedStyles.btnDanger}>Thu hồi</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── Activity Tab ──────────────── */

type AuditRow = {
  id: string;
  action: string;
  entity: string | null;
  summary: string | null;
  created_at: string | null;
};

const ACTION_VISUAL: Record<string, { icon: React.ReactNode; color: string }> = {
  login:         { icon: <LogIn size={14} />,        color: 'var(--color-success)' },
  logout:        { icon: <LogIn size={14} />,        color: 'var(--color-text-muted)' },
  create:        { icon: <Pencil size={14} />,       color: 'hsl(151, 43%, 35%)' },
  update:        { icon: <Pencil size={14} />,       color: 'hsl(217, 91%, 58%)' },
  delete:        { icon: <SettingsIcon size={14} />, color: 'var(--color-error)' },
  status_change: { icon: <ShoppingBag size={14} />,  color: 'hsl(258, 90%, 64%)' },
};

const ENTITY_ICON: Record<string, React.ReactNode> = {
  product: <Package size={14} />,
  order:   <ShoppingBag size={14} />,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'Vừa xong';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

function ActivityTab() {
  const supabase = createBrowserClient();
  const [logs, setLogs] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, entity, summary, created_at')
        .eq('actor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (alive) setLogs((data as AuditRow[]) || []);
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Hoạt động gần đây</h3>
        <p className={styles.panelDesc}>
          20 hoạt động gần nhất của bạn — đọc từ bảng <code>audit_logs</code>.
        </p>
      </div>

      {logs === null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
          <Loader2 size={16} className="animate-spin" /> Đang tải lịch sử...
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Chưa có hoạt động nào được ghi lại.
          <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
            Các thao tác trong trang admin sẽ được tự động ghi vào nhật ký.
          </div>
        </div>
      ) : (
        <ul className={styles.timeline}>
          {logs.map((log) => {
            const visual = ACTION_VISUAL[log.action] || ACTION_VISUAL.update;
            const entity = log.entity || 'general';
            const icon = ENTITY_ICON[entity] || visual.icon;
            return (
              <li key={log.id} className={styles.timelineItem}>
                <span className={styles.timelineDot} style={{ background: visual.color }}>
                  {icon}
                </span>
                <div className={styles.timelineBody}>
                  <div className={styles.timelineTitle}>{log.summary || log.action}</div>
                  <div className={styles.timelineDesc}>
                    {log.action} · {entity}
                  </div>
                </div>
                <div className={styles.timelineTime}>
                  {log.created_at ? timeAgo(log.created_at) : '—'}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ──────────────── Reusable bits ──────────────── */

function Field({
  label,
  hint,
  required,
  full,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <label className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.fieldRequired}>*</span>}
      </label>
      {children}
      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </div>
  );
}
