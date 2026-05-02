'use client';

import { useState, useTransition } from 'react';
import { Loader2, Save, CheckCircle, Store, Mail, Phone, MapPin, Globe, Sparkles } from 'lucide-react';
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
      className={shared.adminCard}
      style={{ maxWidth: 800, marginTop: 24, padding: 32 }}
    >
      <div style={{ marginBottom: 32 }}>
         <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 900, marginBottom: 8, color: 'var(--vg-leaf-900)' }}>
            <Store size={18} /> Nhận diện thương hiệu
         </h3>
         <p style={{ fontSize: 13, color: 'var(--vg-ink-500)', marginBottom: 24 }}>Thông tin này sẽ được hiển thị trên Storefront và hóa đơn khách hàng.</p>
         
         <div className={shared.formRow}>
            <div className={shared.formField}>
              <label className={shared.formLabel}>Tên thương hiệu</label>
              <input
                className={shared.formInput}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="VeganGlow"
              />
            </div>
            <div className={shared.formField}>
              <label className={shared.formLabel}>Khẩu hiệu (Tagline)</label>
              <input
                className={shared.formInput}
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="Vẻ đẹp thuần khiết từ thiên nhiên"
              />
            </div>
         </div>

         <div className={shared.formField}>
            <label className={shared.formLabel}><Globe size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> URL logo</label>
            <input
              className={shared.formInput}
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://..."
            />
         </div>
      </div>

      <div style={{ marginBottom: 32 }}>
         <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 900, marginBottom: 8, color: 'var(--vg-leaf-900)' }}>
            <Mail size={18} /> Thông tin liên hệ
         </h3>
         
         <div className={shared.formRow}>
            <div className={shared.formField}>
              <label className={shared.formLabel}>Email liên hệ</label>
              <input
                type="email"
                className={shared.formInput}
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="contact@veganglow.vn"
              />
            </div>
            <div className={shared.formField}>
              <label className={shared.formLabel}><Phone size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Số điện thoại</label>
              <input
                className={shared.formInput}
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                placeholder="09xx xxx xxx"
              />
            </div>
         </div>

         <div className={shared.formField}>
            <label className={shared.formLabel}><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Địa chỉ trụ sở</label>
            <textarea
              className={shared.formTextarea}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              placeholder="Địa chỉ cửa hàng hoặc văn phòng..."
            />
         </div>
      </div>

      {error && <p className={shared.formError}>{error}</p>}

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12, borderTop: '1px solid var(--vg-parchment-200)', paddingTop: 24 }}>
        <button type="submit" className={`${shared.btn} ${shared.btnPrimary}`} style={{ minWidth: 160 }} disabled={pending}>
          {pending ? <Loader2 size={14} className={shared.spin} /> : <Save size={14} />} 
          Lưu thay đổi
        </button>
        {saved && (
          <span style={{ color: 'var(--vg-success-fg)', fontSize: 14, fontWeight: 800, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <Sparkles size={16} /> Đã cập nhật hệ thống thành công
          </span>
        )}
      </div>
    </form>
  );
}
