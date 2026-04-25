import React from 'react';
import AdminSidebar from './AdminSidebar';
import styles from './Layout.module.css';

interface AdminLayoutProps {
  children: React.ReactNode;
  LinkComponent?: React.ElementType;
}

export default function AdminLayout({ children, LinkComponent }: AdminLayoutProps) {
  return (
    <div className={styles.adminContainer}>
      <AdminSidebar LinkComponent={LinkComponent} />
      <main className={styles.adminMain}>
        {children}
      </main>
    </div>
  );
}
