'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Plus, Edit, Trash2, Loader2, X, Tag } from 'lucide-react';

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
  
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      // Fetch categories and their product counts
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          products:products(count)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      const formattedData = data.map((cat: any) => ({
        ...cat,
        product_count: cat.products?.[0]?.count || 0
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
        const { error } = await (supabase.from('categories') as any)
          .insert([formData]);
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
    if (confirm('Bạn có chắc chắn muốn xóa danh mục này? Các sản phẩm thuộc danh mục này sẽ không còn danh mục.')) {
      try {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        setCategories(categories.filter(c => c.id !== id));
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
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#1a4d2e' }}>Quản lý danh mục</h1>
          <p style={{ color: '#666' }}>Phân loại sản phẩm để khách hàng dễ dàng tìm kiếm.</p>
        </div>
        <button 
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '', slug: '' });
            setIsModalOpen(true);
          }}
          style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            padding: '0.75rem 1.5rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          <Plus size={20} />
          <span>Thêm danh mục</span>
        </button>
      </header>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#666' }}>
              <Loader2 className="animate-spin" />
              Đang tải danh mục...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>DANH MỤC</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>SLUG</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>SỐ SẢN PHẨM</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>NGÀY TẠO</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', background: '#f0fdf4', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Tag size={20} color="#10b981" />
                        </div>
                        <span style={{ fontWeight: '600' }}>{cat.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#666', fontSize: '0.875rem' }}>{cat.slug}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ padding: '4px 12px', background: '#f3f4f6', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {cat.product_count} sản phẩm
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#666', fontSize: '0.875rem' }}>
                      {new Date(cat.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => openEditModal(cat)}
                          style={{ padding: '0.5rem', border: '1px solid #eee', background: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Edit size={18} color="#666" />
                        </button>
                        <button 
                          onClick={() => handleDelete(cat.id)}
                          style={{ padding: '0.5rem', border: '1px solid #eee', background: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Trash2 size={18} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '450px', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={24} color="#999" />
            </button>
            <h2 style={{ marginBottom: '1.5rem', color: '#1a4d2e' }}>{editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Tên danh mục</label>
                <input 
                  required 
                  type="text" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee' }} 
                  value={formData.name} 
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setFormData({ name, slug });
                  }} 
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Slug (URL)</label>
                <input 
                  required 
                  type="text" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#f9f9f9' }} 
                  value={formData.slug} 
                  readOnly
                />
              </div>

              <button 
                type="submit" 
                disabled={isSaving} 
                style={{ 
                  padding: '1rem', 
                  marginTop: '1rem', 
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  opacity: isSaving ? 0.7 : 1 
                }}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu danh mục'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
