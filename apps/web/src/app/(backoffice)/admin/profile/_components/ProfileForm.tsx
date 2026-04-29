'use client';

import { useState, useTransition } from 'react';
import { Loader2, Save, CheckCircle } from 'lucide-react';
import { updateMyStaffProfile } from '@/app/actions/admin/profile';
import shared from '../../admin-shared.module.css';

type StaffProfile = {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string;
  department: string | null;
  position: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export function ProfileForm({ profile }: { profile: StaffProfile }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: profile.full_name,
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    username: profile.username ?? '',
    department: profile.department ?? '',
    position: profile.position ?? '',
    bio: profile.bio ?? '',
  });

  function submit() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateMyStaffProfile({
        full_name: form.full_name.trim(),
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        username: form.username.trim() || undefined,
        department: form.department.trim() || undefined,
        position: form.position.trim() || undefined,
        bio: form.bio.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className={shared.formField}>
        <label className={shared.formLabel}>Email</label>
        <input className={shared.formInput} value={profile.email} disabled />
        <p className={shared.formHint}>Email được quản lý bởi hệ thống xác thực, không thể thay đổi tại đây.</p>
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>Họ và tên</label>
        <input
          className={shared.formInput}
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
        />
      </div>

      <div className={shared.formRow}>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Họ</label>
          <input
            className={shared.formInput}
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </div>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Tên</label>
          <input
            className={shared.formInput}
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
        </div>
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>Username</label>
        <input
          className={shared.formInput}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
      </div>

      <div className={shared.formRow}>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Phòng ban</label>
          <input
            className={shared.formInput}
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
        </div>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Chức vụ</label>
          <input
            className={shared.formInput}
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
        </div>
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>Giới thiệu</label>
        <textarea
          className={shared.formTextarea}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={3}
        />
      </div>

      {error && <p className={shared.formError}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button type="submit" className={`${shared.btn} ${shared.btnPrimary}`} disabled={pending}>
          {pending ? <Loader2 size={14} /> : <Save size={14} />} Lưu thay đổi
        </button>
        {saved && (
          <span style={{ color: 'var(--vg-success-fg)', fontSize: 13, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <CheckCircle size={14} /> Đã lưu
          </span>
        )}
      </div>
    </form>
  );
}
