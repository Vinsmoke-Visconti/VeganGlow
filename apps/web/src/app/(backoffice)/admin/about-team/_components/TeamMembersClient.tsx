'use client';

import { useState, useTransition } from 'react';
import { Plus, Edit, Trash2, X, Loader2, Sparkles, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { upsertTeamMember, deleteTeamMember, reorderTeamMembers } from '@/app/actions/admin/team';
import { uploadAdminImage } from '@/lib/admin/storage';
import { SafeImage } from '@/components/ui/SafeImage';
import shared from '../../admin-shared.module.css';
import styles from './team.module.css';

type TeamMember = {
  id: string;
  full_name: string;
  role_label: string;
  bio: string;
  avatar_url: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
};

const EMPTY_FORM = {
  full_name: '',
  role_label: '',
  bio: '',
  avatar_url: '',
  social_facebook: '',
  social_instagram: '',
  social_linkedin: '',
  is_visible: true,
};

export function TeamMembersClient({ members: initial }: { members: TeamMember[] }) {
  const [members, setMembers] = useState<TeamMember[]>(initial);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(m: TeamMember) {
    setEditing(m);
    setForm({
      full_name: m.full_name,
      role_label: m.role_label,
      bio: m.bio,
      avatar_url: m.avatar_url ?? '',
      social_facebook: m.social_facebook ?? '',
      social_instagram: m.social_instagram ?? '',
      social_linkedin: m.social_linkedin ?? '',
      is_visible: m.is_visible,
    });
    setError(null);
    setOpen(true);
  }

  async function handleAvatar(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadAdminImage('bannerImages', file, 'team');
      setForm((f) => ({ ...f, avatar_url: url }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi upload');
    } finally {
      setUploading(false);
    }
  }

  function save() {
    setError(null);
    start(async () => {
      const order = editing ? editing.display_order : members.length;
      const res = await upsertTeamMember({
        id: editing?.id,
        full_name: form.full_name.trim(),
        role_label: form.role_label.trim(),
        bio: form.bio.trim(),
        avatar_url: form.avatar_url || null,
        social_facebook: form.social_facebook.trim() || null,
        social_instagram: form.social_instagram.trim() || null,
        social_linkedin: form.social_linkedin.trim() || null,
        display_order: order,
        is_visible: form.is_visible,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
    });
  }

  function remove(m: TeamMember) {
    if (!confirm(`Xóa thành viên "${m.full_name}"?`)) return;
    start(async () => {
      const res = await deleteTeamMember(m.id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      setMembers((arr) => arr.filter((x) => x.id !== m.id));
    });
  }

  function move(idx: number, dir: -1 | 1) {
    const swap = idx + dir;
    if (swap < 0 || swap >= members.length) return;
    const next = [...members];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setMembers(next);
    start(async () => {
      await reorderTeamMembers(next.map((m) => m.id));
    });
  }

  return (
    <>
      <div className={shared.toolbar}>
        <p style={{ color: 'var(--vg-ink-500)', margin: 0 }}>{members.length} thành viên</p>
        <button type="button" onClick={openCreate} className={`${shared.btn} ${shared.btnPrimary}`}>
          <Plus size={14} /> Thêm thành viên
        </button>
      </div>

      {members.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Sparkles size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có thành viên</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {members.map((m, i) => (
            <div key={m.id} className={`${styles.card} ${!m.is_visible ? styles.hidden : ''}`}>
              <div className={styles.avatarWrap}>
                {m.avatar_url ? (
                  <SafeImage src={m.avatar_url} alt={m.full_name} fallback="" className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarFallback}>{m.full_name.charAt(0)}</div>
                )}
              </div>
              <div className={styles.cardBody}>
                <h4 className={styles.cardName}>{m.full_name}</h4>
                <p className={styles.cardRole}>{m.role_label}</p>
                {m.bio && <p className={styles.cardBio}>{m.bio}</p>}
                <div className={styles.cardFooter}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || pending}
                      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                      aria-label="Lên"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === members.length - 1 || pending}
                      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                      aria-label="Xuống"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <span
                      className={`${shared.badge} ${m.is_visible ? shared.badgeSuccess : shared.badgeMuted}`}
                    >
                      {m.is_visible ? <Eye size={10} /> : <EyeOff size={10} />}
                      {m.is_visible ? 'Hiển thị' : 'Ẩn'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(m)}
                      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className={shared.modalBackdrop} onClick={() => setOpen(false)}>
          <div className={shared.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>
                {editing ? 'Sửa thành viên' : 'Thành viên mới'}
              </h3>
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
                <label className={shared.formLabel}>Ảnh đại diện</label>
                {form.avatar_url && (
                  <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', marginBottom: 8 }}>
                    <SafeImage src={form.avatar_url} alt="preview" fallback="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <label className={`${shared.btn} ${shared.btnSecondary}`} style={{ width: 'fit-content', cursor: 'pointer' }}>
                  {uploading ? <Loader2 size={14} /> : null} {uploading ? 'Đang tải' : 'Tải ảnh'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleAvatar(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div className={shared.formField}>
                <label className={shared.formLabel}>Họ tên</label>
                <input
                  className={shared.formInput}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>

              <div className={shared.formField}>
                <label className={shared.formLabel}>Vai trò / Chức danh</label>
                <input
                  className={shared.formInput}
                  value={form.role_label}
                  onChange={(e) => setForm({ ...form, role_label: e.target.value })}
                  required
                />
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

              <div className={shared.formField}>
                <label className={shared.formLabel}>Facebook</label>
                <input
                  className={shared.formInput}
                  value={form.social_facebook}
                  onChange={(e) => setForm({ ...form, social_facebook: e.target.value })}
                />
              </div>
              <div className={shared.formField}>
                <label className={shared.formLabel}>Instagram</label>
                <input
                  className={shared.formInput}
                  value={form.social_instagram}
                  onChange={(e) => setForm({ ...form, social_instagram: e.target.value })}
                />
              </div>
              <div className={shared.formField}>
                <label className={shared.formLabel}>LinkedIn</label>
                <input
                  className={shared.formInput}
                  value={form.social_linkedin}
                  onChange={(e) => setForm({ ...form, social_linkedin: e.target.value })}
                />
              </div>

              <div className={shared.formField}>
                <label className={shared.formLabel} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={form.is_visible}
                    onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
                  />
                  Hiển thị trên trang giới thiệu
                </label>
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
                disabled={pending || uploading || !form.full_name.trim()}
                className={`${shared.btn} ${shared.btnPrimary}`}
              >
                {pending ? <Loader2 size={14} /> : null} Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
