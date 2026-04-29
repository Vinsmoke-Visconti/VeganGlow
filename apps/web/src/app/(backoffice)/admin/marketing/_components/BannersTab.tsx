'use client';

import { useState, useTransition } from 'react';
import { Plus, Edit, Trash2, X, Loader2, Image as ImageIcon, Upload } from 'lucide-react';
import { upsertBanner, deleteBanner } from '@/app/actions/admin/marketing';
import { uploadAdminImage } from '@/lib/admin/storage';
import { formatDateShort } from '@/lib/admin/format';
import { SafeImage } from '@/components/ui/SafeImage';
import shared from '../../admin-shared.module.css';
import styles from './banners.module.css';

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cover_gradient: string | null;
  link_url: string | null;
  placement: string | null;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  display_order: number | null;
  created_at: string | null;
};

const PLACEMENT_LABEL: Record<string, string> = {
  home_hero: 'Trang chủ — Hero',
  home_sub: 'Trang chủ — Phụ',
  blog_index: 'Trang Blog',
  category_top: 'Đầu danh mục',
};

function toLocalDateTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function BannersTab({ banners }: { banners: Banner[] }) {
  const [editing, setEditing] = useState<Banner | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    cover_gradient: '',
    link_url: '',
    placement: 'home_hero',
    status: 'draft',
    starts_at: '',
    ends_at: '',
  });

  function openCreate() {
    setEditing(null);
    setForm({
      title: '',
      subtitle: '',
      image_url: '',
      cover_gradient: '',
      link_url: '',
      placement: 'home_hero',
      status: 'draft',
      starts_at: '',
      ends_at: '',
    });
    setError(null);
    setOpen(true);
  }

  function openEdit(b: Banner) {
    setEditing(b);
    setForm({
      title: b.title,
      subtitle: b.subtitle ?? '',
      image_url: b.image_url ?? '',
      cover_gradient: b.cover_gradient ?? '',
      link_url: b.link_url ?? '',
      placement: b.placement ?? 'home_hero',
      status: b.status ?? 'draft',
      starts_at: toLocalDateTime(b.starts_at),
      ends_at: toLocalDateTime(b.ends_at),
    });
    setError(null);
    setOpen(true);
  }

  async function handleImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadAdminImage('bannerImages', file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi upload ảnh');
    } finally {
      setUploading(false);
    }
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await upsertBanner({
        id: editing?.id,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        image_url: form.image_url || '',
        cover_gradient: form.cover_gradient || null,
        link_url: form.link_url || null,
        placement: form.placement,
        status: form.status,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
    });
  }

  function remove(b: Banner) {
    if (!confirm(`Xóa banner "${b.title}"?`)) return;
    start(async () => {
      const res = await deleteBanner(b.id);
      if (!res.ok) alert(res.error);
    });
  }

  return (
    <>
      <div className={shared.toolbar}>
        <p style={{ color: 'var(--vg-ink-500)', margin: 0 }}>{banners.length} banner</p>
        <button type="button" onClick={openCreate} className={`${shared.btn} ${shared.btnPrimary}`}>
          <Plus size={14} /> Tạo banner
        </button>
      </div>

      {banners.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <ImageIcon size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có banner</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {banners.map((b) => (
            <div key={b.id} className={styles.card}>
              <div
                className={styles.preview}
                style={{
                  background: b.cover_gradient ?? 'var(--vg-leaf-100)',
                }}
              >
                {b.image_url ? (
                  <SafeImage src={b.image_url} alt={b.title} fallback="" className={styles.previewImg} />
                ) : (
                  <ImageIcon size={32} color="var(--vg-leaf-700)" />
                )}
              </div>
              <div className={styles.cardBody}>
                <h4 className={styles.cardTitle}>{b.title}</h4>
                {b.subtitle && <p className={styles.cardSub}>{b.subtitle}</p>}
                <div className={styles.cardMeta}>
                  <span className={`${shared.badge} ${shared.badgeMuted}`}>
                    {PLACEMENT_LABEL[b.placement ?? 'home_hero'] ?? b.placement}
                  </span>
                  <span
                    className={`${shared.badge} ${
                      b.status === 'active' ? shared.badgeSuccess : shared.badgePending
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
                {b.ends_at && (
                  <p className={styles.cardSub}>Hết: {formatDateShort(b.ends_at)}</p>
                )}
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(b)}
                    className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className={shared.modalBackdrop} onClick={() => setOpen(false)}>
          <div className={`${shared.modalPanel} ${shared.modalPanelLg}`} onClick={(e) => e.stopPropagation()}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>{editing ? 'Sửa banner' : 'Banner mới'}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>
            <div className={shared.modalBody}>
              <div className={shared.formField}>
                <label className={shared.formLabel}>Ảnh banner</label>
                {form.image_url && (
                  <SafeImage
                    src={form.image_url}
                    alt="preview"
                    fallback=""
                    style={{
                      maxWidth: 320,
                      borderRadius: 12,
                      marginBottom: 8,
                    }}
                  />
                )}
                <label className={`${shared.btn} ${shared.btnSecondary}`} style={{ width: 'fit-content', cursor: 'pointer' }}>
                  {uploading ? <Loader2 size={14} /> : <Upload size={14} />}
                  {uploading ? 'Đang tải...' : form.image_url ? 'Đổi ảnh' : 'Tải ảnh'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div className={shared.formField}>
                <label className={shared.formLabel}>Tiêu đề</label>
                <input
                  className={shared.formInput}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div className={shared.formField}>
                <label className={shared.formLabel}>Phụ đề</label>
                <input
                  className={shared.formInput}
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                />
              </div>

              <div className={shared.formRow}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Vị trí</label>
                  <select
                    className={shared.formSelect}
                    value={form.placement}
                    onChange={(e) => setForm({ ...form, placement: e.target.value })}
                  >
                    {Object.entries(PLACEMENT_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Trạng thái</label>
                  <select
                    className={shared.formSelect}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="draft">Nháp</option>
                    <option value="scheduled">Đã lên lịch</option>
                    <option value="active">Đang chạy</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </div>
              </div>

              <div className={shared.formField}>
                <label className={shared.formLabel}>Link điều hướng</label>
                <input
                  className={shared.formInput}
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="/products/serum-rau-ma"
                />
              </div>

              <div className={shared.formField}>
                <label className={shared.formLabel}>Cover gradient (CSS)</label>
                <input
                  className={shared.formInput}
                  value={form.cover_gradient}
                  onChange={(e) => setForm({ ...form, cover_gradient: e.target.value })}
                  placeholder="linear-gradient(135deg,#a8e6a8 0%,#d4f1d4 100%)"
                />
              </div>

              <div className={shared.formRow}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Bắt đầu</label>
                  <input
                    type="datetime-local"
                    className={shared.formInput}
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Kết thúc</label>
                  <input
                    type="datetime-local"
                    className={shared.formInput}
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  />
                </div>
              </div>

              {error && <p className={shared.formError}>{error}</p>}
            </div>
            <div className={shared.modalFooter}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${shared.btn} ${shared.btnGhost}`}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending || uploading || !form.title.trim()}
                className={`${shared.btn} ${shared.btnPrimary}`}
              >
                {pending ? <Loader2 size={14} /> : null} Lưu banner
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
