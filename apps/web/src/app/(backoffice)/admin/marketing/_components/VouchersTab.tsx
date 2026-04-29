'use client';

import { useState, useTransition } from 'react';
import { Plus, Edit, Trash2, X, Loader2, Ticket, Copy } from 'lucide-react';
import { upsertVoucher, deleteVoucher } from '@/app/actions/admin/marketing';
import { formatVND, formatDateShort } from '@/lib/admin/format';
import shared from '../../admin-shared.module.css';

type Voucher = {
  id: string;
  code: string;
  title: string;
  discount_type: 'percent' | 'fixed' | 'shipping';
  discount_value: number;
  min_order: number;
  quota: number;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  status: 'active' | 'scheduled' | 'expired' | 'draft';
  created_at: string;
};

const STATUS_BADGE: Record<Voucher['status'], string> = {
  active: 'badgeSuccess',
  scheduled: 'badgeInfo',
  expired: 'badgeMuted',
  draft: 'badgePending',
};

const STATUS_LABEL: Record<Voucher['status'], string> = {
  active: 'Đang chạy',
  scheduled: 'Đã lên lịch',
  expired: 'Hết hạn',
  draft: 'Nháp',
};

const DISCOUNT_LABEL: Record<Voucher['discount_type'], string> = {
  percent: '%',
  fixed: 'VND',
  shipping: 'Free ship',
};

function toLocalDateTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function VouchersTab({ vouchers }: { vouchers: Voucher[] }) {
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    title: '',
    discount_type: 'percent' as Voucher['discount_type'],
    discount_value: 10,
    min_order: 0,
    quota: 100,
    starts_at: '',
    expires_at: '',
    status: 'draft' as Voucher['status'],
  });

  function openCreate() {
    setEditing(null);
    setForm({
      code: '',
      title: '',
      discount_type: 'percent',
      discount_value: 10,
      min_order: 0,
      quota: 100,
      starts_at: '',
      expires_at: '',
      status: 'draft',
    });
    setError(null);
    setOpen(true);
  }

  function openEdit(v: Voucher) {
    setEditing(v);
    setForm({
      code: v.code,
      title: v.title,
      discount_type: v.discount_type,
      discount_value: Number(v.discount_value),
      min_order: Number(v.min_order),
      quota: v.quota,
      starts_at: toLocalDateTime(v.starts_at),
      expires_at: toLocalDateTime(v.expires_at),
      status: v.status,
    });
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await upsertVoucher({
        id: editing?.id,
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        min_order: form.min_order,
        quota: form.quota,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        status: form.status,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
    });
  }

  function remove(v: Voucher) {
    if (!confirm(`Xóa voucher "${v.code}"?`)) return;
    start(async () => {
      const res = await deleteVoucher(v.id);
      if (!res.ok) alert(res.error);
    });
  }

  function copyCode(code: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
  }

  return (
    <>
      <div className={shared.toolbar}>
        <p style={{ color: 'var(--vg-ink-500)', margin: 0 }}>{vouchers.length} voucher</p>
        <button type="button" onClick={openCreate} className={`${shared.btn} ${shared.btnPrimary}`}>
          <Plus size={14} /> Tạo voucher
        </button>
      </div>

      {vouchers.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Ticket size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có voucher</p>
        </div>
      ) : (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tiêu đề</th>
                <th>Giảm giá</th>
                <th>Đơn tối thiểu</th>
                <th>Đã dùng / Tổng</th>
                <th>Hết hạn</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id}>
                  <td>
                    <code style={{ fontWeight: 600 }}>{v.code}</code>
                    <button
                      type="button"
                      onClick={() => copyCode(v.code)}
                      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                      aria-label="Copy"
                      title="Copy mã"
                    >
                      <Copy size={12} />
                    </button>
                  </td>
                  <td>{v.title}</td>
                  <td>
                    {v.discount_type === 'percent'
                      ? `${v.discount_value}%`
                      : v.discount_type === 'fixed'
                      ? formatVND(v.discount_value)
                      : `${DISCOUNT_LABEL[v.discount_type]} ${formatVND(v.discount_value)}`}
                  </td>
                  <td>{formatVND(v.min_order)}</td>
                  <td>
                    {v.used_count} / {v.quota || '∞'}
                  </td>
                  <td>{v.expires_at ? formatDateShort(v.expires_at) : '—'}</td>
                  <td>
                    <span className={`${shared.badge} ${shared[STATUS_BADGE[v.status]]}`}>
                      {STATUS_LABEL[v.status]}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
                      aria-label="Sửa"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(v)}
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
      )}

      {open && (
        <div className={shared.modalBackdrop} onClick={() => setOpen(false)}>
          <div className={shared.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>{editing ? 'Sửa voucher' : 'Voucher mới'}</h3>
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
              <div className={shared.formRow}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Mã</label>
                  <input
                    className={shared.formInput}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="NEWGLOW10"
                    required
                  />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Trạng thái</label>
                  <select
                    className={shared.formSelect}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Voucher['status'] })}
                  >
                    <option value="draft">Nháp</option>
                    <option value="scheduled">Đã lên lịch</option>
                    <option value="active">Đang chạy</option>
                    <option value="expired">Hết hạn</option>
                  </select>
                </div>
              </div>

              <div className={shared.formField}>
                <label className={shared.formLabel}>Tiêu đề</label>
                <input
                  className={shared.formInput}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Giảm 10% đơn đầu tiên"
                  required
                />
              </div>

              <div className={shared.formRow}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Loại giảm</label>
                  <select
                    className={shared.formSelect}
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm({ ...form, discount_type: e.target.value as Voucher['discount_type'] })
                    }
                  >
                    <option value="percent">Phần trăm</option>
                    <option value="fixed">Số tiền cố định</option>
                    <option value="shipping">Free shipping</option>
                  </select>
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>
                    Giá trị {form.discount_type === 'percent' ? '(%)' : '(VND)'}
                  </label>
                  <input
                    type="number"
                    className={shared.formInput}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                    min={0}
                  />
                </div>
              </div>

              <div className={shared.formRow}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Đơn tối thiểu (VND)</label>
                  <input
                    type="number"
                    className={shared.formInput}
                    value={form.min_order}
                    onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })}
                    min={0}
                  />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Số lượng (0 = không giới hạn)</label>
                  <input
                    type="number"
                    className={shared.formInput}
                    value={form.quota}
                    onChange={(e) => setForm({ ...form, quota: Number(e.target.value) })}
                    min={0}
                  />
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
                  />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Kết thúc</label>
                  <input
                    type="datetime-local"
                    className={shared.formInput}
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
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
                disabled={pending || !form.code.trim() || !form.title.trim()}
                className={`${shared.btn} ${shared.btnPrimary}`}
              >
                {pending ? <Loader2 size={14} /> : null} Lưu voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
