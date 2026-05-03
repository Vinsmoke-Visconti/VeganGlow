'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Trash2, DollarSign, Package, Tag, FlaskConical, CheckCircle2, X } from 'lucide-react';
import { upsertProduct, deleteProduct } from '@/app/actions/admin/products';
import { uploadAdminImage } from '@/lib/admin/storage';
import { slugify } from '@/lib/admin/format';
import { SafeImage } from '@/components/ui/SafeImage';
import type { ProductTag } from '@/lib/types/tag';
import shared from '../../admin-shared.module.css';

type Category = { id: string; name: string; slug?: string };

type ProductFormValue = {
  id?: string;
  name: string;
  slug: string;
  price: number;
  category_id: string | null;
  image: string;
  description: string;
  ingredients: string;
  stock: number;
  is_active: boolean;
  tag_ids?: string[];
};

const EMPTY: ProductFormValue = {
  name: '',
  slug: '',
  price: 0,
  category_id: null,
  image: '',
  description: '',
  ingredients: '',
  stock: 0,
  is_active: true,
  tag_ids: [],
};

export function ProductForm({
  product,
  categories,
  availableTags = [],
}: {
  product?: ProductFormValue;
  categories: Category[];
  availableTags?: ProductTag[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormValue>(() =>
    product ?? { ...EMPTY, category_id: categories[0]?.id ?? null },
  );
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const selectedTagIds = new Set(form.tag_ids ?? []);

  function toggleTag(tagId: string) {
    setForm((f) => {
      const current = new Set(f.tag_ids ?? []);
      if (current.has(tagId)) current.delete(tagId);
      else current.add(tagId);
      return { ...f, tag_ids: Array.from(current) };
    });
  }

  async function handleImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      // Use product slug for renaming if available, otherwise name-based slug
      const fileName = form.slug || slugify(form.name) || 'product';
      const { url } = await uploadAdminImage('productImages', file, '', fileName);
      setForm((f) => ({ ...f, image: url }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi upload ảnh');
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    setError(null);
    const payload: ProductFormValue = {
      ...form,
      slug: form.slug || slugify(form.name),
      category_id: form.category_id || null,
      tag_ids: form.tag_ids ?? [],
    };
    start(async () => {
      const res = await upsertProduct({
        ...payload,
        category_id: payload.category_id ?? '',
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push('/admin/products');
      router.refresh();
    });
  }

  function remove() {
    if (!product?.id) return;
    if (!confirm('Xóa sản phẩm này? Hành động không thể hoàn tác.')) return;
    setError(null);
    start(async () => {
      const res = await deleteProduct(product.id!);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push('/admin/products');
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={shared.adminCard}
      style={{ marginTop: 20, padding: 0 }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px' }}>
        {/* Left Side: Fields */}
        <div style={{ padding: '24px', borderRight: '1px solid var(--vg-border)' }}>
          <section style={{ marginBottom: 24 }}>
             <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900, marginBottom: 16, color: 'var(--vg-ink-900)', textTransform: 'uppercase' }}>
               Thông tin cơ bản
             </h3>
             <div className={shared.formRow}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Tên sản phẩm</label>
                  <input
                    className={shared.formInput}
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        name: e.target.value,
                        slug: f.slug || slugify(e.target.value),
                      }))
                    }
                    placeholder="VD: Serum Vitamin C"
                    required
                  />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}>Slug</label>
                  <input
                    className={shared.formInput}
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="serum-vitamin-c"
                    required
                  />
                </div>
             </div>

             <div className={shared.formRow}>
                <div className={shared.formField}>
                  <label className={shared.formLabel}><DollarSign size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Giá bán (VND)</label>
                  <input
                    type="number"
                    className={shared.formInput}
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    required
                    min={0}
                    step={1000}
                  />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}><Package size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Tồn kho</label>
                  <input
                    type="number"
                    className={shared.formInput}
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                    min={0}
                  />
                </div>
                <div className={shared.formField}>
                  <label className={shared.formLabel}><Tag size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Danh mục</label>
                  <select
                    className={shared.formSelect}
                    value={form.category_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}
                  >
                    <option value="">— Chọn —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
             </div>
          </section>

          <section>
             <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900, marginBottom: 16, color: 'var(--vg-ink-900)', textTransform: 'uppercase' }}>
               Mô tả & Thành phần
             </h3>
             <div className={shared.formField}>
                <label className={shared.formLabel}>Mô tả sản phẩm</label>
                <textarea
                  className={shared.formTextarea}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={6}
                  placeholder="Viết một đoạn mô tả hấp dẫn về sản phẩm..."
                />
             </div>
             <div className={shared.formField}>
                <label className={shared.formLabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FlaskConical size={14} /> Thành phần chi tiết
                </label>
                <textarea
                  className={shared.formTextarea}
                  value={form.ingredients}
                  onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
                  rows={4}
                  placeholder="VD: Aqua, Glycerin, Centella Asiatica Extract..."
                />
             </div>
          </section>

          {/* Tags Section */}
          <section style={{ marginTop: 24 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900, marginBottom: 8, color: 'var(--vg-ink-900)', textTransform: 'uppercase' }}>
              <Tag size={14} /> Nhãn / Tag
            </h3>
            <p style={{ fontSize: 12, color: 'var(--vg-ink-500)', marginBottom: 12, lineHeight: 1.5 }}>
              Một sản phẩm có thể gắn nhiều nhãn (Bán chạy, Mới về, Thuần chay…). Click để chọn/bỏ chọn.
            </p>
            {availableTags.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--vg-ink-500)', fontStyle: 'italic' }}>
                Chưa có nhãn nào. Hãy thêm nhãn trong bảng <code>tags</code>.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {availableTags.map((tag) => {
                  const isSelected = selectedTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: isSelected ? `2px solid ${tag.color}` : '2px solid var(--vg-border)',
                        background: isSelected ? tag.color : 'var(--vg-surface-0)',
                        color: isSelected ? tag.text_color : 'var(--vg-ink-700)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {tag.name}
                      {isSelected && <X size={12} />}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedTagIds.size > 0 && (
              <p style={{ fontSize: 11, color: 'var(--vg-ink-500)', marginTop: 8 }}>
                Đã chọn {selectedTagIds.size} nhãn
              </p>
            )}
          </section>
        </div>

        {/* Right Side: Media & Status */}
        <div style={{ padding: '24px', background: 'var(--vg-surface-50)' }}>
           <h3 style={{ fontSize: 12, fontWeight: 900, marginBottom: 16, color: 'var(--vg-ink-600)', textTransform: 'uppercase' }}>Ảnh & Trạng thái</h3>
           
           <div className={shared.formField}>
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
                  handleImage(e.dataTransfer.files[0]);
                }
              }}
              style={{ 
                aspectRatio: '1/1', 
                borderRadius: 16, 
                overflow: 'hidden', 
                background: dragOver ? 'var(--vg-surface-200)' : 'var(--vg-surface-0)', 
                border: dragOver ? '2px solid var(--vg-leaf-500)' : '2px dashed var(--vg-border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                marginBottom: 16,
                transition: 'all 0.2s ease',
                transform: dragOver ? 'scale(1.02)' : 'scale(1)',
                boxShadow: dragOver ? '0 12px 24px rgba(6, 78, 59, 0.1)' : 'none'
              }}
            >
              {form.image ? (
                <SafeImage src={form.image} alt="preview" fallback="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 20 }}>
                   <Upload size={32} className={dragOver ? '' : shared.iconMuted} style={{ marginBottom: 12, color: dragOver ? 'var(--vg-leaf-600)' : undefined }} />
                   <p style={{ fontSize: 12, color: dragOver ? 'var(--vg-leaf-700)' : 'var(--vg-ink-500)', fontWeight: 700 }}>
                     {dragOver ? 'Thả để tải lên' : 'Chưa có ảnh'}
                   </p>
                </div>
              )}
              {uploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'grid', placeItems: 'center' }}>
                   <Loader2 className={shared.spin} size={24} />
                </div>
              )}
            </div>
              <label className={`${shared.btn} ${shared.btnSecondary}`} style={{ width: '100%', cursor: 'pointer', justifyContent: 'center' }}>
                <Upload size={14} /> {form.image ? 'Đổi ảnh sản phẩm' : 'Tải ảnh lên'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
                />
              </label>
           </div>

           <div style={{ 
             background: 'var(--vg-surface-0)', 
             padding: 16, 
             borderRadius: 12, 
             border: '1px solid var(--vg-border)',
             marginTop: 24
           }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: 6, 
                  border: '2px solid var(--vg-leaf-500)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: form.is_active ? 'var(--vg-leaf-500)' : 'transparent'
                }}>
                  {form.is_active && <CheckCircle2 size={14} color="#fff" />}
                  <input
                    type="checkbox"
                    hidden
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--vg-ink-900)' }}>Hiển thị trên cửa hàng</span>
              </label>
              <p style={{ fontSize: 11, color: 'var(--vg-ink-500)', marginTop: 8, lineHeight: 1.5 }}>Nếu tắt, sản phẩm sẽ được ẩn khỏi khách hàng nhưng vẫn tồn tại trong hệ thống quản trị.</p>
           </div>

           {error && <p className={shared.formError} style={{ marginTop: 16 }}>{error}</p>}
        </div>
      </div>

      <div className={shared.modalFooter} style={{ padding: '16px 32px', background: 'var(--vg-surface-0)' }}>
        <button type="submit" className={`${shared.btn} ${shared.btnPrimary}`} style={{ minWidth: 160 }} disabled={pending || uploading}>
          {pending ? <Loader2 className={shared.spin} size={14} /> : null}
          {product?.id ? 'Lưu thay đổi' : 'Tạo sản phẩm mới'}
        </button>
        {product?.id && (
          <button type="button" onClick={remove} className={`${shared.btn} ${shared.btnGhost}`} style={{ color: 'var(--vg-danger-fg)' }} disabled={pending}>
            <Trash2 size={14} /> Xóa sản phẩm
          </button>
        )}
      </div>
    </form>
  );
}
