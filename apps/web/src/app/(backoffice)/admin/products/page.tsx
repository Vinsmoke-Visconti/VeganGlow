'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Plus, Edit, Trash2, Search, Loader2, X, Tag } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import styles from '../admin-shared.module.css';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  image: string;
  category_id: string;
  categories?: { name: string };
  ingredients: string;
  description: string;
};

type Category = {
  id: string;
  name: string;
};

export default function AdminProducts() {
  const supabase = createBrowserClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price: '',
    stock: 10,
    ingredients: '',
    description: '',
    image: '',
    category_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*, categories:category_id(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name'),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, category_id: (categoriesRes.data as any)[0].id }));
      }
    } catch (err: any) {
      alert('Lỗi khi tải dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock.toString()),
      };

      if (editingId) {
        const { error } = await (supabase.from('products') as any).update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('products') as any).insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
      fetchData();
      alert(editingId ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      price: '',
      stock: 10,
      ingredients: '',
      description: '',
      image: '',
      category_id: categories[0]?.id || '',
    });
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      slug: product.slug,
      price: product.price.toString(),
      stock: product.stock,
      ingredients: product.ingredients || '',
      description: product.description || '',
      image: product.image || '',
      category_id: product.category_id,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        setProducts(products.filter((p) => p.id !== id));
      } catch (err: any) {
        alert('Lỗi khi xóa: ' + err.message);
      }
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categories?.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Quản lý sản phẩm</h1>
          <p className={styles.pageSubtitle}>Quản lý kho sản phẩm VeganGlow trực tiếp.</p>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={() => {
            setEditingId(null);
            resetForm();
            setIsModalOpen(true);
          }}
        >
          <Plus size={18} />
          Thêm sản phẩm
        </button>
      </header>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm sản phẩm..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tableScroll}>
          {loading ? (
            <div className={styles.loadingState}>
              <Loader2 className="animate-spin" size={22} />
              Đang tải sản phẩm...
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá</th>
                  <th>Tồn kho</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className={styles.emptyState}>Không tìm thấy sản phẩm nào.</div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className={styles.productCell}>
                          <div className={styles.avatarSquare}>
                            <SafeImage
                              src={product.image}
                              fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=B7E4C7&color=1B4332`}
                              alt={product.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <span style={{ fontWeight: 600 }}>{product.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.categoryBadge}>
                          <Tag size={12} />
                          {product.categories?.name || 'Chưa phân loại'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{product.price.toLocaleString('vi-VN')}đ</td>
                      <td>
                        <span className={product.stock < 5 ? styles.stockLow : styles.stockOk}>
                          {product.stock}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className={styles.btnOutline} onClick={() => handleEdit(product)}>
                            <Edit size={15} />
                          </button>
                          <button className={styles.btnDanger} onClick={() => handleDelete(product.id)}>
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

      {/* Product Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button className={styles.modalCloseBtn} onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            <h2 className={styles.modalTitle}>
              {editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </h2>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tên sản phẩm</label>
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
                    setFormData({ ...formData, name, slug });
                  }}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Danh mục</label>
                  <select
                    required
                    className={styles.select}
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giá (VNĐ)</label>
                  <input
                    required
                    type="number"
                    className={styles.input}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số lượng tồn kho</label>
                  <input
                    required
                    type="number"
                    className={styles.input}
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Slug URL</label>
                  <input
                    required
                    type="text"
                    readOnly
                    className={`${styles.input} ${styles.inputReadonly}`}
                    value={formData.slug}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Mô tả ngắn</label>
                <textarea
                  rows={2}
                  className={styles.textarea}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Thành phần</label>
                <textarea
                  rows={2}
                  className={styles.textarea}
                  value={formData.ingredients}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Link ảnh sản phẩm</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className={styles.input}
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
              </div>

              <button type="submit" disabled={isSaving} className={styles.submitBtn}>
                {isSaving ? 'Đang lưu...' : 'Lưu sản phẩm'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
