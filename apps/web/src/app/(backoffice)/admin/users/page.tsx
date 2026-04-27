'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { UserPlus, Search, Loader2, Shield, Mail, Phone, Edit, UserMinus } from 'lucide-react';

type Role = {
  id: string;
  name: string;
  display_name: string;
};

type StaffMember = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role_id: string;
  is_active: boolean;
  avatar_url: string;
  roles: Role;
};

export default function AdminStaff() {
  const supabase = createBrowserClient();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [staffRes, rolesRes] = await Promise.all([
        supabase
          .from('staff_profiles')
          .select(`
            *,
            roles:role_id (id, name, display_name)
          `)
          .order('full_name', { ascending: true }),
        supabase
          .from('roles')
          .select('id, name, display_name')
          .neq('name', 'customer')
      ]);

      if (staffRes.error) throw staffRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setStaff((staffRes.data as unknown as StaffMember[]) || []);
      setRoles((rolesRes.data as unknown as Role[]) || []);
    } catch (err: any) {
      alert('Lỗi khi tải dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(staffId: string, currentStatus: boolean) {
    try {
      const { error } = await (supabase.from('staff_profiles') as any)
        .update({ is_active: !currentStatus })
        .eq('id', staffId);

      if (error) throw error;
      setStaff(staff.map(s => s.id === staffId ? { ...s, is_active: !currentStatus } : s));
    } catch (err: any) {
      alert('Lỗi khi cập nhật trạng thái: ' + err.message);
    }
  }

  const filteredStaff = staff.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#1a4d2e' }}>Nhân sự & Phân quyền</h1>
          <p style={{ color: '#666' }}>Quản lý đội ngũ nhân viên và các cấp độ truy cập hệ thống.</p>
        </div>
        <button
          onClick={() => alert('Tính năng thêm nhân sự sẽ được phát hành ở phiên bản tiếp theo.')}
          style={{
            display: 'flex', 
            gap: '0.5rem', 
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1a4d2e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          <UserPlus size={20} />
          <span>Thêm nhân sự</span>
        </button>
      </header>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
           <div style={{ position: 'relative', maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input 
                type="text" 
                placeholder="Tìm theo tên hoặc email..." 
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
              Đang tải danh sách nhân sự...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>NHÂN VIÊN</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>VAI TRÒ</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>LIÊN HỆ</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#666' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>Chưa có nhân sự nào được đăng ký.</td>
                  </tr>
                ) : filteredStaff.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e8f5e9', color: '#1a4d2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                          {member.full_name?.charAt(0) || '?'}
                        </div>
                        <span style={{ fontWeight: '600' }}>{member.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '12px', backgroundColor: '#f3f4f6', fontSize: '13px', fontWeight: '500' }}>
                        <Shield size={14} color="#666" />
                        {member.roles?.display_name}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#444' }}>
                          <Mail size={14} color="#999" /> {member.email}
                        </div>
                        {member.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#444' }}>
                            <Phone size={14} color="#999" /> {member.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        backgroundColor: member.is_active ? '#d1fae5' : '#fee2e2',
                        color: member.is_active ? '#10b981' : '#ef4444'
                      }}>
                        {member.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button style={{ padding: '0.5rem', border: '1px solid #eee', background: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                          <Edit size={16} color="#666" />
                        </button>
                        <button 
                          onClick={() => toggleStatus(member.id, member.is_active)}
                          style={{ padding: '0.5rem', border: '1px solid #eee', background: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          {member.is_active ? <UserMinus size={16} color="#ef4444" /> : <UserPlus size={16} color="#10b981" />}
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
    </div>
  );
}
