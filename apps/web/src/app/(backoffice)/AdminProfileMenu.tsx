'use client';

import Link from 'next/link';
import { User, LogOut } from 'lucide-react';
import { adminLogout } from '@/app/actions/auth';
import styles from './backoffice-layout.module.css';

type Props = {
  displayName: string;
  initial: string;
  roleLabel: string;
};

export function AdminProfileMenu({ displayName, initial, roleLabel }: Props) {
  return (
    <div className={styles.headerProfileWrap}>
      <Link href="/admin/profile" className={styles.headerProfileBlock} title="Hồ sơ của tôi">
        <div className={styles.headerAvatar}>{initial}</div>
        <div className={styles.headerUserInfo}>
          <span className={styles.headerUserName}>{displayName}</span>
          <span className={styles.headerUserRole}>{roleLabel}</span>
        </div>
        <User size={16} className={styles.headerProfileIcon} />
      </Link>
      
      <div className={styles.headerDivider} />
      
      <form action={adminLogout} style={{ margin: 0, display: 'flex' }}>
        <button
          type="submit"
          className={styles.headerLogoutBtn}
          title="Đăng xuất"
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </form>
    </div>
  );
}
