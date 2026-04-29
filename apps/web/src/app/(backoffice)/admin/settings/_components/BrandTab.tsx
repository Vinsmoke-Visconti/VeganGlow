'use client';

import { useState, useTransition } from 'react';
import { Loader2, Save, CheckCircle } from 'lucide-react';
import { setSystemSetting } from '@/app/actions/admin/settings';
import type { BrandInfo } from '@/lib/admin/queries/settings';
import shared from '../../admin-shared.module.css';

export function BrandTab({ initial }: { initial: BrandInfo }) {
  const [form, setForm] = useState<BrandInfo>(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await setSystemSetting('brand_info', form);
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
      style={{ maxWidth: 640 }}
    >
      <div className={shared.formField}>
        <label className={shared.formLabel}>Tên thương hiệu</label>
        <input
          className={shared.formInput}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>Khẩu hiệu</label>
        <input
          className={shared.formInput}
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
        />
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>URL logo</label>
        <input
          className={shared.formInput}
          value={form.logo_url}
          onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className={shared.formRow}>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Email liên hệ</label>
          <input
            type="email"
            className={shared.formInput}
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          />
        </div>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Số điện thoại</label>
          <input
            className={shared.formInput}
            value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          />
        </div>
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>Địa chỉ</label>
        <textarea
          className={shared.formTextarea}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          rows={2}
        />
      </div>

      {error && <p className={shared.formError}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button type="submit" className={`${shared.btn} ${shared.btnPrimary}`} disabled={pending}>
          {pending ? <Loader2 size={14} /> : <Save size={14} />} Lưu thông tin
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
