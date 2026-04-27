'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Plus, Edit, Trash2, Loader2, X, Tag } from 'lucide-react';
import styles from '../admin-shared.module.css';

type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  product_count?: number;
};

export default function AdminCategories() {
  const supabase = createBrowserClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({ name: '', slug: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*, products:products(count)')
        .order('name', { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map((cat: any) => ({
        ...cat,
        product_count: cat.products?.[0]?.count || 0,
      }));

      setCategories(formattedData);
    } catch (err: any) {
      alert('Lỗi khi tải danh mục: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingCategory) {
        const { error } = await (supabase.from('categories') as any)
          .update(formData)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('categories') as any).insert([formData]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData({ name: '', slug: '' });
      fetchCategories();
      alert(editingCategory ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        'Bạn có chắc chắn muốn xóa danh mục này? Các sản phẩm thuộc danh mục này sẽ không còn danh mục.',
      )
    ) {
      try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        setCategories(categories.filter((c) => c.id !== id));
      } catch (err: any) {
        alert('Lỗi khi xóa: ' + err.message);
      }
    }
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, slug: cat.slug });
    setIsModalOpen(true);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Quản lý danh mục</h1>
          <p className={styles.pageSubtitle}>Phân loại sản phẩm để khách hàng dễ dàng tìm kiếm.</p>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '', slug: '' });
            setIsModalOpen(true);
          }}
        >
          <Plus size={18} />
          Thêm danh mục
        </button>
      </header>

      <div className={styles.card}>
        <div className={styles.tableScroll}>
          {loading ? (
            <div className={styles.loadingState}>
              <Loader2 className="animate-spin" size={22} />
              Đang tải danh mục...
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Danh mục</th>
                  <th>Slug</th>
                  <th>Số sản phẩm</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className={styles.emptyState}>Chưa có danh mục nào.</div>
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id}>
                      <td>
                        <div className={styles.productCell}>
                          <div
                            className={styles.avatarSquare}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Tag size={20} style={{ color: 'var(--color-primary)' }} />
                          </div>
                          <span style={{ fontWeight: 600 }}>{cat.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{cat.slug}</td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                          {cat.product_count} sản phẩm
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                        {new Date(cat.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className={styles.btnOutline} onClick={() => openEditModal(cat)}>
                            <Edit size={15} />
                          </button>
                          <button className={styles.btnDanger} onClick={() => handleDelete(cat.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button className={styles.modalCloseBtn} onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            <h2 className={styles.modalTitle}>
              {editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}
            </h2>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tên danh mục</label>
                <input
                  required
                  type="text"
                  className={styles.input}
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[̀-ͯ]/g, '')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)+/g, '');
                    setFormData({ name, slug });
                  }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Slug (URL)</label>
                <input
                  required
                  type="text"
                  readOnly
                  className={`${styles.input} ${styles.inputReadonly}`}
                  value={formData.slug}
                />
              </div>

              <button type="submit" disabled={isSaving} className={styles.submitBtn}>
                {isSaving ? 'Đang lưu...' : 'Lưu danh mục'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
