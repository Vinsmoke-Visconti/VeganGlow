'use client';

import { Fragment, useState, useTransition } from 'react';
import { Loader2, Save, CheckCircle } from 'lucide-react';
import { setRolePermissions } from '@/app/actions/admin/roles';
import shared from '../../admin-shared.module.css';
import styles from './roles.module.css';

type Permission = {
  id: string;
  module: string;
  action: string;
  description: string;
};

type RoleWithPerms = {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissionIds: string[];
};

const MODULE_LABEL: Record<string, string> = {
  products: 'Sản phẩm',
  orders: 'Đơn hàng',
  users: 'Nhân sự',
  customers: 'Khách hàng',
  marketing: 'Marketing',
  settings: 'Cài đặt',
};

const ACTION_LABEL: Record<string, string> = {
  read: 'Xem',
  write: 'Sửa',
  delete: 'Xóa',
};

export function PermissionMatrix({
  roles,
  permissions,
}: {
  roles: RoleWithPerms[];
  permissions: Permission[];
}) {
  const [state, setState] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(roles.map((r) => [r.id, new Set(r.permissionIds)])),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [, start] = useTransition();

  function toggle(roleId: string, permId: string) {
    setState((s) => {
      const next = new Set(s[roleId]);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return { ...s, [roleId]: next };
    });
  }

  function save(roleId: string) {
    setPendingId(roleId);
    setSavedId(null);
    start(async () => {
      const res = await setRolePermissions(roleId, Array.from(state[roleId]));
      setPendingId(null);
      if (res.ok) {
        setSavedId(roleId);
        setTimeout(() => setSavedId((curr) => (curr === roleId ? null : curr)), 2000);
      }
    });
  }

  const byModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  const visibleRoles = roles.filter((r) => r.name !== 'customer');

  return (
    <div className={shared.tableWrap}>
      <table className={shared.table}>
        <thead>
          <tr>
            <th style={{ minWidth: 180 }}>Quyền</th>
            {visibleRoles.map((r) => (
              <th key={r.id} style={{ textAlign: 'center' }}>
                <div>{r.display_name}</div>
                {r.name === 'super_admin' && (
                  <div style={{ fontSize: 10, color: 'var(--vg-ink-500)', textTransform: 'none' }}>
                    Toàn quyền
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(byModule).map(([mod, perms]) => (
            <Fragment key={mod}>
              <tr className={styles.moduleRow}>
                <td colSpan={1 + visibleRoles.length}>
                  <strong>{MODULE_LABEL[mod] ?? mod}</strong>
                </td>
              </tr>
              {perms.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.description || `${ACTION_LABEL[p.action] ?? p.action} ${MODULE_LABEL[p.module] ?? p.module}`}
                  </td>
                  {visibleRoles.map((r) => (
                    <td key={r.id} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={r.name === 'super_admin' ? true : state[r.id].has(p.id)}
                        disabled={r.name === 'super_admin'}
                        onChange={() => toggle(r.id, p.id)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
          <tr>
            <td>
              <strong>Lưu thay đổi</strong>
            </td>
            {visibleRoles.map((r) => (
              <td key={r.id} style={{ textAlign: 'center' }}>
                {r.name === 'super_admin' ? (
                  <span className={`${shared.badge} ${shared.badgeMuted}`}>—</span>
                ) : (
                  <button
                    type="button"
                    className={`${shared.btn} ${shared.btnPrimary} ${shared.btnIcon}`}
                    disabled={pendingId === r.id}
                    onClick={() => save(r.id)}
                    aria-label={`Lưu quyền ${r.display_name}`}
                  >
                    {pendingId === r.id ? (
                      <Loader2 size={14} />
                    ) : savedId === r.id ? (
                      <CheckCircle size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                  </button>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
