'use client';

import { useState, useTransition } from 'react';
import { Plus, Edit, Trash2, X, Loader2, Zap, Clock } from 'lucide-react';
import { upsertFlashSale, deleteFlashSale } from '@/app/actions/admin/marketing';
import { formatDate } from '@/lib/admin/format';
import { SafeImage } from '@/components/ui/SafeImage';
import shared from '../../admin-shared.module.css';
import { AdminViewSwitcher, ViewMode } from '../../_components/AdminViewSwitcher';
import styles from '../marketing.module.css';

type FlashSale = {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'active' | 'expired' | 'draft';
  created_at: string;
};

type ProductOption = { id: string; name: string };

const STATUS_BADGE: Record<FlashSale['status'], string> = {
  scheduled: 'badgeInfo',
  active: 'badgeSuccess',
  expired: 'badgeMuted',
  draft: 'badgePending',
};

const STATUS_LABEL: Record<FlashSale['status'], string> = {
  scheduled: 'Đã lên lịch',
  active: 'Đang chạy',
  expired: 'Đã kết thúc',
  draft: 'Nháp',
};

function toLocalDateTime(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function FlashTab({
  sales,
  products,
}: {
  sales: FlashSale[];
  products: ProductOption[];
}) {
  const [editing, setEditing] = useState<FlashSale | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [form, setForm] = useState({
    product_id: products[0]?.id ?? '',
    discount_percent: 20,
    starts_at: '',
    ends_at: '',
    status: 'scheduled' as FlashSale['status'],
  });

  function openCreate() {
    setEditing(null);
    const now = new Date();
    const inHour = new Date(now.getTime() + 3600_000);
    setForm({
      product_id: products[0]?.id ?? '',
      discount_percent: 20,
      starts_at: toLocalDateTime(now.toISOString()),
      ends_at: toLocalDateTime(inHour.toISOString()),
      status: 'scheduled',
    });
    setError(null);
    setOpen(true);
  }

  function openEdit(s: FlashSale) {
    setEditing(s);
    setForm({
      product_id: s.product_id,
      discount_percent: s.discount_percent,
      starts_at: toLocalDateTime(s.starts_at),
      ends_at: toLocalDateTime(s.ends_at),
      status: s.status,
    });
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await upsertFlashSale({
        id: editing?.id,
        product_id: form.product_id,
        discount_percent: form.discount_percent,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        status: form.status,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
    });
  }

  function remove(s: FlashSale) {
    if (!confirm(`Xóa flash sale "${s.product_name}"?`)) return;
    start(async () => {
      const res = await deleteFlashSale(s.id);
      if (!res.ok) alert(res.error);
    });
  }

  return (
    <>
      <div className={shared.toolbar}>
        <AdminViewSwitcher mode={viewMode} onChange={setViewMode} />
        <button type="button" onClick={openCreate} className={`${shared.btn} ${shared.btnPrimary}`}>
          <Plus size={14} /> Tạo flash sale
        </button>
      </div>

      {sales.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Zap size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có flash sale</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Giảm</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.product_image ? (
                        <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden' }}>
                          <SafeImage
                            src={s.product_image}
                            alt={s.product_name}
                            fallback=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ) : null}
                      <strong>{s.product_name}</strong>
                    </div>
                  </td>
                  <td>{s.discount_percent}%</td>
                  <td>{formatDate(s.starts_at)}</td>
                  <td>{formatDate(s.ends_at)}</td>
                  <td>
                    <span className={`${shared.badge} ${shared[STATUS_BADGE[s.status]]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(s)}
                      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
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
          {sales.map((s) => (
            <div key={s.id} className={shared.adminCard}>
              <div className={shared.adminCardHeader}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {s.product_image && (
                    <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden' }}>
                      <SafeImage src={s.product_image} alt={s.product_name} fallback="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div>
                    <h4 className={shared.adminCardTitle}>{s.product_name}</h4>
                    <span className={`${shared.badge} ${shared.badgeDanger}`} style={{ marginTop: 4 }}>
                      GIẢM {s.discount_percent}%
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                   <button onClick={() => openEdit(s)} className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}>
                     <Edit size={14} />
                   </button>
                </div>
              </div>
              <div className={shared.adminCardContent}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                   <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} className={shared.iconMuted} />
                      Bắt đầu: {formatDate(s.starts_at)}
                   </div>
                   <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} className={shared.iconMuted} />
                      Kết thúc: {formatDate(s.ends_at)}
                   </div>
                </div>
              </div>
              <div className={shared.adminCardFooter}>
                 <span className={`${shared.badge} ${shared[STATUS_BADGE[s.status]]}`}>
                   {STATUS_LABEL[s.status]}
                 </span>
                 <button onClick={() => remove(s)} className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}>
                   <Trash2 size={14} />
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className={shared.modalBackdrop} onClick={() => setOpen(false)}>
          <div className={shared.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>{editing ? 'Sửa flash sale' : 'Flash sale mới'}</h3>
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
                <label className={shared.formLabel}>Sản phẩm</label>
                <select
                  className={shared.formSelect}
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={shared.formRow}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Giảm giá (%)</label>
                  <input
                    type="number"
                    className={shared.formInput}
                    value={form.discount_percent}
                    onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })}
                    min={1}
                    max={99}
                  />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Trạng thái</label>
                  <select
                    className={shared.formSelect}
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as FlashSale['status'] })
                    }
                  >
                    <option value="draft">Nháp</option>
                    <option value="scheduled">Đã lên lịch</option>
                    <option value="active">Đang chạy</option>
                    <option value="expired">Đã kết thúc</option>
                  </select>
                </div>
              </div>

              <div className={shared.formRow}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Bắt đầu</label>
                  <input
                    type="datetime-local"
                    className={shared.formInput}
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    required
                  />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Kết thúc</label>
                  <input
                    type="datetime-local"
                    className={shared.formInput}
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                    required
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
                disabled={pending || !form.product_id || !form.starts_at || !form.ends_at}
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
