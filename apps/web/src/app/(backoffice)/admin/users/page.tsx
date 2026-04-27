'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { UserPlus, Search, Loader2, Shield, Mail, Phone, Edit, UserMinus } from 'lucide-react';
import styles from '../admin-shared.module.css';

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
          .select('*, roles:role_id (id, name, display_name)')
          .order('full_name', { ascending: true }),
        supabase.from('roles').select('id, name, display_name').neq('name', 'customer'),
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
      setStaff(staff.map((s) => (s.id === staffId ? { ...s, is_active: !currentStatus } : s)));
    } catch (err: any) {
      alert('Lỗi khi cập nhật trạng thái: ' + err.message);
    }
  }

  const filteredStaff = staff.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Nhân sự & Phân quyền</h1>
          <p className={styles.pageSubtitle}>Quản lý đội ngũ nhân viên và các cấp độ truy cập hệ thống.</p>
        </div>
        <button
          className={styles.btnDark}
          onClick={() => alert('Tính năng thêm nhân sự sẽ được phát hành ở phiên bản tiếp theo.')}
        >
          <UserPlus size={18} />
          Thêm nhân sự
        </button>
      </header>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
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
              Đang tải danh sách nhân sự...
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Vai trò</th>
                  <th>Liên hệ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className={styles.emptyState}>Chưa có nhân sự nào được đăng ký.</div>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className={styles.productCell}>
                          <div className={styles.avatarCircle}>
                            {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span style={{ fontWeight: 600 }}>{member.full_name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                          <Shield size={12} />
                          {member.roles?.display_name}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                            <Mail size={13} style={{ color: 'var(--color-text-muted)' }} />
                            {member.email}
                          </span>
                          {member.phone && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                              <Phone size={13} style={{ color: 'var(--color-text-muted)' }} />
                              {member.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            member.is_active ? styles.badgeSuccess : styles.badgeDanger
                          }`}
                        >
                          {member.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className={styles.btnOutline}>
                            <Edit size={15} />
                          </button>
                          <button
                            className={member.is_active ? styles.btnDanger : styles.btnOutline}
                            onClick={() => toggleStatus(member.id, member.is_active)}
                            title={member.is_active ? 'Tạm khóa' : 'Kích hoạt lại'}
                          >
                            {member.is_active ? <UserMinus size={15} /> : <UserPlus size={15} />}
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
    </div>
  );
}
