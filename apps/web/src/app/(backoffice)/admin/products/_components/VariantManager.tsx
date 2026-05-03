'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit3, Save, X, Loader2, ImagePlus, Upload } from 'lucide-react';
import { upsertVariant, deleteVariant, type VariantInput } from '@/app/actions/admin/variants';
import { uploadAdminImage } from '@/lib/admin/storage';
import { SafeImage } from '@/components/ui/SafeImage';
import type { AdminVariantRow } from '@/lib/admin/queries/products';
import shared from '../../admin-shared.module.css';

type Props = {
  productId: string;
  variants: AdminVariantRow[];
};

type Draft = {
  id?: string;
  sku: string;
  name: string;
  attribute_pairs: { key: string; value: string }[];
  price: number;
  compare_at_price: number | null;
  stock: number;
  image_url: string | null;
  position: number;
  is_active: boolean;
};

const NEW_DRAFT: Draft = {
  sku: '',
  name: '',
  attribute_pairs: [{ key: 'Dung tích', value: '' }],
  price: 0,
  compare_at_price: null,
  stock: 0,
  image_url: null,
  position: 0,
  is_active: true,
};

function rowToDraft(row: AdminVariantRow): Draft {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    attribute_pairs: Object.entries(row.attributes ?? {}).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    })),
    price: row.price,
    compare_at_price: row.compare_at_price,
    stock: row.stock,
    image_url: row.image_url,
    position: row.position,
    is_active: row.is_active,
  };
}

function draftToInput(productId: string, draft: Draft): VariantInput {
  const attributes: Record<string, string> = {};
  draft.attribute_pairs.forEach(({ key, value }) => {
    if (key.trim() && value.trim()) attributes[key.trim()] = value.trim();
  });
  return {
    id: draft.id,
    product_id: productId,
    sku: draft.sku.trim(),
    name: draft.name.trim() || draft.sku.trim(),
    attributes,
    price: Math.max(0, Number(draft.price) || 0),
    compare_at_price: draft.compare_at_price === null ? null : Math.max(0, Number(draft.compare_at_price) || 0),
    stock: Math.max(0, Math.floor(Number(draft.stock) || 0)),
    image_url: draft.image_url,
    position: draft.position,
    is_active: draft.is_active,
  };
}

export function VariantManager({ productId, variants }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function startNew() {
    setEditing({ ...NEW_DRAFT, position: variants.length });
    setError(null);
  }

  function startEdit(row: AdminVariantRow) {
    setEditing(rowToDraft(row));
    setError(null);
  }

  function cancel() {
    setEditing(null);
    setError(null);
  }

  function save() {
    if (!editing) return;
    if (!editing.sku.trim()) {
      setError('SKU không được để trống');
      return;
    }
    setError(null);
    const payload = draftToInput(productId, editing);
    start(async () => {
      const res = await upsertVariant(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm('Xóa biến thể này? Hành động không thể hoàn tác.')) return;
    setError(null);
    start(async () => {
      const res = await deleteVariant(id, productId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  async function handleImageUpload(file: File | null) {
    if (!file || !editing) return;
    setUploading(true);
    try {
      // Use variant SKU or name for renaming
      const fileName = (editing.sku || editing.name || 'variant').toLowerCase().replace(/\s+/g, '-');
      const { url } = await uploadAdminImage('productImages', file, '', fileName);
      setEditing({ ...editing, image_url: url });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi upload ảnh');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ marginTop: 32, padding: 24, background: 'var(--vg-surface-0)', borderRadius: 16, border: '1px solid var(--vg-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 900, color: 'var(--vg-ink-900)', textTransform: 'uppercase', margin: 0 }}>
          Biến thể sản phẩm ({variants.length})
        </h3>
        {!editing && (
          <button type="button" onClick={startNew} className={`${shared.btn} ${shared.btnPrimary}`}>
            <Plus size={14} /> Thêm biến thể
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--vg-ink-500)', marginBottom: 16, lineHeight: 1.5 }}>
        Mỗi biến thể đại diện cho một dung tích/phiên bản (vd: 30ml, 50ml). Stock theo từng biến thể, hết hàng tự ẩn nút mua.
      </p>

      {error && <p className={shared.formError} style={{ marginBottom: 12 }}>{error}</p>}

      {/* Existing variants table */}
      {variants.length > 0 && !editing && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--vg-border)' }}>
                <th style={th}>Ảnh</th>
                <th style={th}>SKU</th>
                <th style={th}>Tên / Thuộc tính</th>
                <th style={{ ...th, textAlign: 'right' }}>Giá</th>
                <th style={{ ...th, textAlign: 'right' }}>Tồn</th>
                <th style={th}>Trạng thái</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--vg-surface-100)' }}>
                  <td style={td}>
                    {v.image_url ? (
                      <SafeImage src={v.image_url} alt={v.sku} fallback="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, background: 'var(--vg-surface-100)', borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 12, color: 'var(--vg-ink-400)' }}>—</div>
                    )}
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{v.sku}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 700 }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--vg-ink-500)' }}>
                      {Object.entries(v.attributes ?? {}).map(([k, val]) => `${k}: ${val}`).join(' • ') || '—'}
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                    {new Intl.NumberFormat('vi-VN').format(v.price)}đ
                    {v.compare_at_price && v.compare_at_price > v.price && (
                      <div style={{ fontSize: 11, color: 'var(--vg-ink-400)', textDecoration: 'line-through' }}>
                        {new Intl.NumberFormat('vi-VN').format(v.compare_at_price)}đ
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <span style={{
                      fontWeight: 700,
                      color: v.stock <= 0 ? '#dc2626' : v.stock < 5 ? '#d97706' : '#16a34a',
                    }}>
                      {v.stock}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: v.is_active ? '#16a34a' : 'var(--vg-ink-400)',
                    }}>
                      {v.is_active ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button type="button" onClick={() => startEdit(v)} className={`${shared.btn} ${shared.btnGhost}`} style={{ padding: '4px 8px', marginRight: 4 }}>
                      <Edit3 size={12} />
                    </button>
                    <button type="button" onClick={() => remove(v.id)} className={`${shared.btn} ${shared.btnGhost}`} style={{ padding: '4px 8px', color: '#dc2626' }} disabled={pending}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {variants.length === 0 && !editing && (
        <p style={{ fontSize: 13, color: 'var(--vg-ink-500)', fontStyle: 'italic', textAlign: 'center', padding: 24 }}>
          Chưa có biến thể nào. Click &ldquo;Thêm biến thể&rdquo; để tạo phiên bản đầu tiên.
        </p>
      )}

      {/* Edit/Create form */}
      {editing && (
        <div style={{ background: 'var(--vg-surface-50)', padding: 20, borderRadius: 12, border: '1px solid var(--vg-border)', marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16 }}>
            {/* Image */}
            <div>
              <label className={shared.formLabel} style={{ fontSize: 11 }}>Ảnh biến thể</label>
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleImageUpload(e.dataTransfer.files[0]);
                  }
                }}
                style={{ 
                  aspectRatio: '1/1', 
                  border: dragOver ? '2px solid var(--vg-leaf-500)' : '2px dashed var(--vg-border)', 
                  borderRadius: 8, 
                  overflow: 'hidden', 
                  position: 'relative', 
                  background: dragOver ? 'var(--vg-surface-100)' : 'var(--vg-surface-0)',
                  transition: 'all 0.2s ease',
                  transform: dragOver ? 'scale(1.05)' : 'scale(1)',
                  zIndex: 10
                }}
              >
                {editing.image_url ? (
                  <SafeImage src={editing.image_url} alt="variant" fallback="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: dragOver ? 'var(--vg-leaf-600)' : 'var(--vg-ink-400)' }}>
                    {dragOver ? <Upload size={24} /> : <ImagePlus size={20} />}
                  </div>
                )}
                {uploading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'grid', placeItems: 'center' }}>
                    <Loader2 className={shared.spin} size={16} />
                  </div>
                )}
              </div>
              <label className={`${shared.btn} ${shared.btnSecondary}`} style={{ width: '100%', marginTop: 6, fontSize: 11, justifyContent: 'center', cursor: 'pointer' }}>
                Đổi ảnh
                <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>SKU</label>
                  <input className={shared.formInput} value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} placeholder="VG-CN50-30" required />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Tên hiển thị</label>
                  <input className={shared.formInput} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="30ml" />
                </div>
              </div>

              {/* Attributes */}
              <div className={shared.formField}>
                <label className={shared.formLabel}>Thuộc tính (vd: Dung tích → 30ml, Màu → Đỏ)</label>
                {editing.attribute_pairs.map((pair, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input
                      className={shared.formInput}
                      placeholder="Tên thuộc tính"
                      value={pair.key}
                      onChange={(e) => {
                        const next = [...editing.attribute_pairs];
                        next[idx] = { ...next[idx], key: e.target.value };
                        setEditing({ ...editing, attribute_pairs: next });
                      }}
                      style={{ flex: 1 }}
                    />
                    <input
                      className={shared.formInput}
                      placeholder="Giá trị (vd 30ml)"
                      value={pair.value}
                      onChange={(e) => {
                        const next = [...editing.attribute_pairs];
                        next[idx] = { ...next[idx], value: e.target.value };
                        setEditing({ ...editing, attribute_pairs: next });
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className={`${shared.btn} ${shared.btnGhost}`}
                      onClick={() => {
                        const next = editing.attribute_pairs.filter((_, i) => i !== idx);
                        setEditing({ ...editing, attribute_pairs: next.length ? next : [{ key: '', value: '' }] });
                      }}
                      style={{ padding: '6px 10px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={`${shared.btn} ${shared.btnGhost}`}
                  onClick={() => setEditing({ ...editing, attribute_pairs: [...editing.attribute_pairs, { key: '', value: '' }] })}
                  style={{ fontSize: 11 }}
                >
                  <Plus size={12} /> Thêm thuộc tính
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Giá (VND)</label>
                  <input type="number" className={shared.formInput} value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} min={0} step={1000} required />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Giá gốc (so sánh)</label>
                  <input type="number" className={shared.formInput} value={editing.compare_at_price ?? ''} onChange={(e) => setEditing({ ...editing, compare_at_price: e.target.value === '' ? null : Number(e.target.value) })} min={0} step={1000} placeholder="—" />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Tồn kho</label>
                  <input type="number" className={shared.formInput} value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} min={0} required />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Vị trí</label>
                  <input type="number" className={shared.formInput} value={editing.position} onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })} min={0} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                Hiển thị biến thể trên cửa hàng
              </label>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={save} className={`${shared.btn} ${shared.btnPrimary}`} disabled={pending}>
                  {pending ? <Loader2 className={shared.spin} size={14} /> : <Save size={14} />}
                  {editing.id ? 'Lưu thay đổi' : 'Tạo biến thể'}
                </button>
                <button type="button" onClick={cancel} className={`${shared.btn} ${shared.btnGhost}`} disabled={pending}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  color: 'var(--vg-ink-500)',
  padding: '8px 12px',
  letterSpacing: '0.04em',
};
const td: React.CSSProperties = {
  padding: '12px',
  verticalAlign: 'middle',
};
