'use client';

import { Fragment, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Shield, Loader2, Check, X, Lock, Eye, Edit, Trash2 as TrashIcon } from 'lucide-react';
import sharedStyles from '../admin-shared.module.css';
import styles from './roles.module.css';

type Role = {
  id: string;
  name: string;
  display_name: string;
  description?: string | null;
};

type Permission = {
  key: string;
  label: string;
  module: string;
};

const PERMISSIONS: Permission[] = [
  { key: 'orders.view', label: 'Xem đơn hàng', module: 'Đơn hàng' },
  { key: 'orders.update', label: 'Cập nhật trạng thái', module: 'Đơn hàng' },
  { key: 'orders.cancel', label: 'Hủy đơn', module: 'Đơn hàng' },
  { key: 'products.view', label: 'Xem sản phẩm', module: 'Sản phẩm' },
  { key: 'products.create', label: 'Thêm sản phẩm', module: 'Sản phẩm' },
  { key: 'products.update', label: 'Sửa sản phẩm', module: 'Sản phẩm' },
  { key: 'products.delete', label: 'Xóa sản phẩm', module: 'Sản phẩm' },
  { key: 'customers.view', label: 'Xem khách hàng', module: 'Khách hàng' },
  { key: 'customers.contact', label: 'Liên hệ khách', module: 'Khách hàng' },
  { key: 'staff.view', label: 'Xem nhân sự', module: 'Hệ thống' },
  { key: 'staff.manage', label: 'Quản lý nhân sự', module: 'Hệ thống' },
  { key: 'settings.update', label: 'Cấu hình hệ thống', module: 'Hệ thống' },
];

const ROLE_MATRIX: Record<string, string[]> = {
  super_admin: PERMISSIONS.map((p) => p.key),
  admin: PERMISSIONS.filter((p) => !p.key.startsWith('staff.manage')).map((p) => p.key),
  manager: [
    'orders.view',
    'orders.update',
    'products.view',
    'products.update',
    'customers.view',
    'customers.contact',
  ],
  staff: ['orders.view', 'orders.update', 'products.view', 'customers.view'],
  customer: [],
};

const PERMISSION_ICON: Record<string, React.ReactNode> = {
  view: <Eye size={11} />,
  update: <Edit size={11} />,
  create: <Edit size={11} />,
  delete: <TrashIcon size={11} />,
  cancel: <X size={11} />,
  contact: <Edit size={11} />,
  manage: <Lock size={11} />,
};

function getActionIcon(key: string) {
  const action = key.split('.')[1];
  return PERMISSION_ICON[action] || <Check size={11} />;
}

export default function AdminRoles() {
  const supabase = createBrowserClient();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('roles')
          .select('id, name, display_name, description')
          .order('name');
        if (error) throw error;
        if (alive) setRoles((data as Role[]) || []);
      } catch (err: any) {
        alert('Lỗi khi tải vai trò: ' + err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  const grouped = PERMISSIONS.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] = acc[p.module] || []).push(p);
    return acc;
  }, {});

  return (
    <div className={sharedStyles.page}>
      <header className={sharedStyles.pageHeader}>
        <div>
          <h1 className={sharedStyles.pageTitle}>Phân quyền (RBAC)</h1>
          <p className={sharedStyles.pageSubtitle}>
            Ma trận quyền theo vai trò — kiểm soát ai được làm gì trong hệ thống quản trị.
          </p>
        </div>
      </header>

      {/* Role overview */}
      <div className={sharedStyles.statsRow}>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Tổng vai trò</div>
          <div className={sharedStyles.statValue}>{roles.length}</div>
        </div>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Quyền hệ thống</div>
          <div className={sharedStyles.statValue}>{PERMISSIONS.length}</div>
        </div>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Module</div>
          <div className={sharedStyles.statValue}>{Object.keys(grouped).length}</div>
        </div>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Cơ chế</div>
          <div
            className={sharedStyles.statValue}
            style={{ fontSize: 'var(--text-base)', whiteSpace: 'nowrap' }}
          >
            Postgres RLS
          </div>
        </div>
      </div>

      {loading ? (
        <div className={sharedStyles.card}>
          <div className={sharedStyles.loadingState}>
            <Loader2 className="animate-spin" size={22} />
            Đang tải vai trò...
          </div>
        </div>
      ) : (
        <>
          {/* Roles cards */}
          <section className={styles.rolesSection}>
            <h2 className={styles.sectionTitle}>
              <Shield size={18} className={styles.sectionIcon} />
              Vai trò trong hệ thống
            </h2>
            <div className={styles.rolesGrid}>
              {roles.length === 0 && (
                <div className={sharedStyles.emptyState}>
                  Chưa có vai trò nào trong DB. Hãy seed bảng <code>roles</code>.
                </div>
              )}
              {roles.map((role) => {
                const granted = ROLE_MATRIX[role.name] || [];
                const pct = Math.round((granted.length / PERMISSIONS.length) * 100);
                return (
                  <div key={role.id} className={styles.roleCard}>
                    <div className={styles.roleHeader}>
                      <div className={styles.roleIcon}>
                        <Shield size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={styles.roleName}>{role.display_name}</div>
                        <div className={styles.roleSlug}>{role.name}</div>
                      </div>
                      <span className={styles.roleCount}>
                        {granted.length}/{PERMISSIONS.length}
                      </span>
                    </div>
                    <div className={styles.roleBar}>
                      <div className={styles.roleBarFill} style={{ width: `${pct}%` }} />
                    </div>
                    {role.description && (
                      <p className={styles.roleDesc}>{role.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Matrix */}
          <section className={sharedStyles.card}>
            <div className={styles.matrixHeader}>
              <div>
                <h2 className={styles.matrixTitle}>Ma trận quyền</h2>
                <p className={styles.matrixDesc}>
                  Mỗi ô đánh dấu một role có hay không có quyền đó.
                </p>
              </div>
              <span className={`${sharedStyles.badge} ${sharedStyles.badgeNeutral}`}>
                Read-only · Demo
              </span>
            </div>
            <div className={sharedStyles.tableScroll}>
              <table className={`${sharedStyles.table} ${styles.matrixTable}`}>
                <thead>
                  <tr>
                    <th>Quyền</th>
                    {roles.map((r) => (
                      <th key={r.id} className={styles.matrixCol}>
                        {r.display_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([module, perms]) => (
                    <Fragment key={module}>
                      <tr className={styles.matrixGroupRow}>
                        <td colSpan={roles.length + 1}>{module}</td>
                      </tr>
                      {perms.map((p) => (
                        <tr key={p.key}>
                          <td>
                            <span className={styles.permLabel}>
                              <span className={styles.permIcon}>{getActionIcon(p.key)}</span>
                              {p.label}
                              <code className={styles.permKey}>{p.key}</code>
                            </span>
                          </td>
                          {roles.map((r) => {
                            const has = (ROLE_MATRIX[r.name] || []).includes(p.key);
                            return (
                              <td key={r.id} className={styles.matrixCell}>
                                {has ? (
                                  <span className={styles.matrixYes}>
                                    <Check size={14} />
                                  </span>
                                ) : (
                                  <span className={styles.matrixNo}>
                                    <X size={14} />
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
