'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { upsertProduct, deleteProduct } from '@/app/actions/admin/products';
import { uploadAdminImage } from '@/lib/admin/storage';
import { slugify } from '@/lib/admin/format';
import { SafeImage } from '@/components/ui/SafeImage';
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
};

export function ProductForm({
  product,
  categories,
}: {
  product?: ProductFormValue;
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormValue>(() =>
    product ?? { ...EMPTY, category_id: categories[0]?.id ?? null },
  );
  const [uploading, setUploading] = useState(false);

  async function handleImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadAdminImage('productImages', file);
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
      style={{ maxWidth: 720, marginTop: 24 }}
    >
      <div className={shared.formField}>
        <label className={shared.formLabel}>Ảnh sản phẩm</label>
        {form.image && (
          <div style={{ width: 200, height: 200, borderRadius: 12, overflow: 'hidden', background: 'var(--vg-parchment-100)' }}>
            <SafeImage src={form.image} alt="preview" fallback="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <label className={`${shared.btn} ${shared.btnSecondary}`} style={{ width: 'fit-content', cursor: 'pointer' }}>
          {uploading ? <Loader2 size={14} /> : <Upload size={14} />}
          {uploading ? 'Đang tải...' : form.image ? 'Đổi ảnh' : 'Tải ảnh lên'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
          />
        </label>
        <p className={shared.formHint}>Ảnh tối ưu kích thước 1080×1080px, định dạng JPG/PNG/WEBP.</p>
      </div>

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
            required
          />
        </div>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Slug</label>
          <input
            className={shared.formInput}
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            required
          />
          <p className={shared.formHint}>URL: /products/{form.slug || 'slug-san-pham'}</p>
        </div>
      </div>

      <div className={shared.formRow}>
        <div className={shared.formField}>
          <label className={shared.formLabel}>Giá (VND)</label>
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
          <label className={shared.formLabel}>Tồn kho</label>
          <input
            type="number"
            className={shared.formInput}
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
            min={0}
          />
        </div>
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>Danh mục</label>
        <select
          className={shared.formSelect}
          value={form.category_id ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))}
        >
          <option value="">— Chọn danh mục —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>Mô tả</label>
        <textarea
          className={shared.formTextarea}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={4}
        />
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel}>Thành phần</label>
        <textarea
          className={shared.formTextarea}
          value={form.ingredients}
          onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
          rows={3}
        />
      </div>

      <div className={shared.formField}>
        <label className={shared.formLabel} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          Hiển thị trên cửa hàng
        </label>
      </div>

      {error && <p className={shared.formError}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button type="submit" className={`${shared.btn} ${shared.btnPrimary}`} disabled={pending || uploading}>
          {pending ? <Loader2 size={14} /> : null} Lưu sản phẩm
        </button>
        {product?.id && (
          <button type="button" onClick={remove} className={`${shared.btn} ${shared.btnDanger}`} disabled={pending}>
            <Trash2 size={14} /> Xóa
          </button>
        )}
      </div>
    </form>
  );
}
