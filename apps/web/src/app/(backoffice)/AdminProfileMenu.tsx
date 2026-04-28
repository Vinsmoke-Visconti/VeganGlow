'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, User, Lock, LogOut } from 'lucide-react';
import { adminLogout } from '@/app/actions/auth';
import styles from './backoffice-layout.module.css';

type Props = {
  displayName: string;
  initial: string;
  email: string;
  roleLabel: string;
};

export function AdminProfileMenu({ displayName, initial, email, roleLabel }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  return (
    <div className={styles.profileMenuWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.userProfile}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className={styles.avatar}>{initial}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userRole}>{roleLabel}</span>
        </div>
        <ChevronDown
          size={14}
          className={`${styles.userChevron} ${open ? styles.userChevronOpen : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className={styles.profileMenu} role="menu">
          <div className={styles.profileMenuHeader}>
            <div className={styles.profileMenuAvatar}>{initial}</div>
            <div className={styles.profileMenuInfo}>
              <span className={styles.profileMenuName}>{displayName}</span>
              <span className={styles.profileMenuEmail}>{email}</span>
              <span className={styles.profileMenuRoleChip}>{roleLabel}</span>
            </div>
          </div>

          <div className={styles.profileMenuDivider} />

          <Link
            href="/admin/profile"
            className={styles.profileMenuItem}
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <User size={16} />
            <span>Hồ sơ của tôi</span>
          </Link>
          <Link
            href="/admin/profile?tab=security"
            className={styles.profileMenuItem}
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <Lock size={16} />
            <span>Đổi mật khẩu</span>
          </Link>

          <div className={styles.profileMenuDivider} />

          <form action={adminLogout}>
            <button
              type="submit"
              className={`${styles.profileMenuItem} ${styles.profileMenuItemDanger}`}
              role="menuitem"
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
