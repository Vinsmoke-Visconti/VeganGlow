'use client';

import { useState, useTransition } from 'react';
import { Plus, Edit, Trash2, X, Loader2, Tag } from 'lucide-react';
import { upsertCategory, deleteCategory } from '@/app/actions/admin/categories';
import { slugify } from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';
import { AdminViewSwitcher, ViewMode } from '../../_components/AdminViewSwitcher';

type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  product_count: number;
};

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  function openCreate() {
    setEditing(null);
    setName('');
    setSlug('');
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setName(c.name);
    setSlug(c.slug);
    setError(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  function save() {
    setError(null);
    const finalSlug = slug || slugify(name);
    start(async () => {
      const res = await upsertCategory({
        id: editing?.id,
        name: name.trim(),
        slug: finalSlug,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
    });
  }

  function remove(c: Category) {
    if (!confirm(`Xóa danh mục "${c.name}"?`)) return;
    start(async () => {
      const res = await deleteCategory(c.id);
      if (!res.ok) alert(res.error);
    });
  }

  return (
    <>
      <div className={shared.toolbar}>
        <AdminViewSwitcher mode={viewMode} onChange={setViewMode} />
        <button type="button" className={`${shared.btn} ${shared.btnPrimary}`} onClick={openCreate}>
          <Plus size={14} /> Thêm danh mục
        </button>
      </div>

      {categories.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Tag size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có danh mục</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Tên</th>
                <th>Slug</th>
                <th>Số sản phẩm</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr 
                  key={c.id} 
                  className={shared.clickableRow}
                  onClick={() => openEdit(c)}
                >
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>
                    <code style={{ fontSize: 12, color: 'var(--vg-ink-500)' }}>{c.slug}</code>
                  </td>
                  <td>
                    <span className={`${shared.badge} ${shared.badgeMuted}`}>{c.product_count}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                      aria-label="Sửa"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      disabled={pending}
                      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                      aria-label="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={shared.cardGrid}>
          {categories.map((c) => (
            <div key={c.id} className={shared.adminCard} style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>
              <div className={shared.adminCardHeader}>
                <h3 className={shared.adminCardTitle}>{c.name}</h3>
                <span className={`${shared.badge} ${shared.badgeMuted}`}>{c.product_count} SP</span>
              </div>
              <div className={shared.adminCardContent}>
                <code style={{ fontSize: 11, color: 'var(--vg-ink-400)' }}>/{c.slug}</code>
              </div>
              <div className={shared.adminCardFooter}>
                <div className={shared.pageActions}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                    className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); remove(c); }}
                    disabled={pending}
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
        <div className={shared.modalBackdrop} onClick={close}>
          <div className={shared.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>{editing ? 'Sửa danh mục' : 'Danh mục mới'}</h3>
              <button type="button" onClick={close} className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`} aria-label="Đóng">
                <X size={16} />
              </button>
            </div>
            <div className={shared.modalBody}>
              <div className={shared.formField}>
                <label className={shared.formLabel}>Tên danh mục</label>
                <input
                  className={shared.formInput}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editing) setSlug(slugify(e.target.value));
                  }}
                  autoFocus
                />
              </div>
              <div className={shared.formField}>
                <label className={shared.formLabel}>Slug</label>
                <input
                  className={shared.formInput}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
              {error && <p className={shared.formError}>{error}</p>}
            </div>
            <div className={shared.modalFooter}>
              <button type="button" onClick={close} className={`${shared.btn} ${shared.btnGhost}`}>
                Hủy
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending || !name.trim()}
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
