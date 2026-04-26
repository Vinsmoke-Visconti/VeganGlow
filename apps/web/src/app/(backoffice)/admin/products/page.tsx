'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Plus, Edit, Trash2, Search, Loader2, X, Tag } from 'lucide-react';

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
  
  // Modal State
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
    category_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*, categories:category_id(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name')
      ]);
      
      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      
      if (categoriesRes.data && categoriesRes.data.length > 0) {
        setFormData(prev => ({ ...prev, category_id: (categoriesRes.data as any)[0].id }));
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
        stock: parseInt(formData.stock.toString())
      };

      if (editingId) {
        const { error } = await (supabase.from('products') as any)
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('products') as any)
          .insert([payload]);
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
      category_id: categories[0]?.id || ''
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
      category_id: product.category_id
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        setProducts(products.filter(p => p.id !== id));
      } catch (err: any) {
        alert('Lỗi khi xóa: ' + err.message);
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#1a4d2e' }}>Quản lý sản phẩm</h1>
          <p style={{ color: '#666' }}>Quản lý kho sản phẩm VeganGlow trực tiếp.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            resetForm();
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
          <span>Thêm sản phẩm</span>
        </button>
      </header>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input 
                type="text" 
                placeholder="Tìm sản phẩm..." 
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #eee', outline: 'none' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: '#666' }}>
              <Loader2 className="animate-spin" />
              Đang tải sản phẩm...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>SẢN PHẨM</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>DANH MỤC</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>GIÁ</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>TỒN KHO</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', background: '#f0fdf4', borderRadius: '8px', overflow: 'hidden' }}>
                          <img src={product.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=B7E4C7&color=1B4332`} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontWeight: '600' }}>{product.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#f3f4f6', borderRadius: '20px', fontSize: '12px' }}>
                        <Tag size={12} /> {product.categories?.name || 'Chưa phân loại'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>{product.price.toLocaleString('vi-VN')}đ</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ color: product.stock < 5 ? '#ef4444' : '#10b981', fontWeight: '700' }}>{product.stock}</span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                         <button 
                            onClick={() => handleEdit(product)}
                            style={{ padding: '0.5rem', border: '1px solid #eee', background: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <Edit size={18} />
                          </button>
                         <button 
                            style={{ padding: '0.5rem', border: '1px solid #eee', background: 'none', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }} 
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 size={18} />
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

      {/* Product Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={24} color="#999" />
            </button>
            <h2 style={{ marginBottom: '1.5rem', color: '#1a4d2e' }}>{editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Tên sản phẩm</label>
                <input 
                  required 
                  type="text" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee' }} 
                  value={formData.name} 
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setFormData({...formData, name, slug});
                  }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Danh mục</label>
                  <select 
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee' }} 
                    value={formData.category_id} 
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Giá (VNĐ)</label>
                  <input required type="number" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee' }} value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Số lượng tồn kho</label>
                  <input required type="number" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee' }} value={formData.stock} onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Slug URL</label>
                  <input required type="text" readOnly style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#f9f9f9' }} value={formData.slug} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Mô tả ngắn</label>
                <textarea rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee', resize: 'none' }} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Thành phần</label>
                <textarea rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee', resize: 'none' }} value={formData.ingredients} onChange={(e) => setFormData({...formData, ingredients: e.target.value})} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Link ảnh sản phẩm</label>
                <input type="text" placeholder="https://..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee' }} value={formData.image} onChange={(e) => setFormData({...formData, image: e.target.value})} />
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
                {isSaving ? 'Đang lưu...' : 'Lưu sản phẩm'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
