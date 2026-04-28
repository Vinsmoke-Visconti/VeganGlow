'use client';

import { useEffect, useState, useActionState, useTransition } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  UserPlus,
  Search,
  Loader2,
  Shield,
  Mail,
  Phone,
  Edit,
  UserMinus,
  X,
  Send,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { inviteStaff } from '@/app/actions/staff';
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

const INITIAL_INVITE_STATE: { error?: string; success?: string } = {};

export default function AdminStaff() {
  const supabase = createBrowserClient();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const [inviteState, inviteAction] = useActionState(inviteStaff, INITIAL_INVITE_STATE);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when invite succeeds
  useEffect(() => {
    if (inviteState.success) {
      fetchData();
      // Auto-close after a moment so user sees success
      const t = setTimeout(() => setModalOpen(false), 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteState.success]);

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

  const filteredStaff = staff.filter((s) => {
    const matchSearch =
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || s.role_id === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Nhân sự & Phân quyền</h1>
          <p className={styles.pageSubtitle}>
            Quản lý đội ngũ nhân viên và các cấp độ truy cập hệ thống.
          </p>
        </div>
        <button className={styles.btnDark} onClick={() => setModalOpen(true)}>
          <UserPlus size={18} />
          Mời nhân sự mới
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
          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.display_name}
              </option>
            ))}
          </select>
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
                      <div className={styles.emptyState}>
                        {staff.length === 0
                          ? 'Chưa có nhân sự nào được đăng ký.'
                          : 'Không tìm thấy nhân sự khớp với bộ lọc.'}
                      </div>
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
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 13,
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            <Mail size={13} style={{ color: 'var(--color-text-muted)' }} />
                            {member.email}
                          </span>
                          {member.phone && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 13,
                                color: 'var(--color-text-secondary)',
                              }}
                            >
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
                          <button className={styles.btnOutline} title="Sửa thông tin">
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

      {/* Invite Modal */}
      {modalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className={styles.modal}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setModalOpen(false)}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
            <h2 className={styles.modalTitle}>Mời nhân sự mới</h2>
            <p className={styles.modalSubtitle}>
              Nhập email — hệ thống sẽ tự promote khi nhân sự đăng nhập lần đầu.
            </p>

            {inviteState.error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  background: 'hsl(0, 74%, 97%)',
                  color: 'hsl(0, 74%, 38%)',
                  border: '1px solid hsl(0, 74%, 86%)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                <AlertTriangle size={16} /> {inviteState.error}
              </div>
            )}

            {inviteState.success && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  background: 'hsl(151, 43%, 95%)',
                  color: 'hsl(151, 43%, 22%)',
                  border: '1px solid hsl(151, 43%, 80%)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                <CheckCircle size={16} /> {inviteState.success}
              </div>
            )}

            <form
              action={(formData) => startTransition(() => inviteAction(formData))}
              className={styles.form}
            >
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Email <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  className={styles.input}
                  placeholder="nhanvien@veganglow.vn"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Họ và tên <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  className={styles.input}
                  placeholder="VD: Nguyễn Văn A"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Vai trò</label>
                <select name="roleName" className={styles.select} defaultValue="customer_support">
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isPending}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {isPending ? 'Đang gửi...' : 'Gửi lời mời'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
