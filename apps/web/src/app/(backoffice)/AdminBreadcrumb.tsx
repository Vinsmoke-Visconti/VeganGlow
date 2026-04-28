'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import styles from './backoffice-layout.module.css';

const SEGMENT_LABEL: Record<string, string> = {
  admin: 'Admin',
  orders: 'Đơn hàng',
  products: 'Sản phẩm',
  categories: 'Danh mục',
  customers: 'Khách hàng',
  users: 'Nhân sự',
  roles: 'Phân quyền',
  settings: 'Cài đặt',
  marketing: 'Tiếp thị',
  profile: 'Hồ sơ của tôi',
  'about-team': 'Tác giả & Nhóm',
};

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  let acc = '';
  const crumbs = segments.map((seg) => {
    acc += `/${seg}`;
    return { href: acc, label: SEGMENT_LABEL[seg] || decodeURIComponent(seg) };
  });

  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <Link href="/admin" className={styles.breadcrumbHome} aria-label="Trang chủ Admin">
        <Home size={13} />
      </Link>
      {crumbs.slice(1).map((c, i) => {
        const isLast = i === crumbs.length - 2;
        return (
          <span key={c.href} className={styles.breadcrumbItem}>
            <ChevronRight size={12} className={styles.breadcrumbSep} aria-hidden="true" />
            {isLast ? (
              <span className={styles.breadcrumbCurrent}>{c.label}</span>
            ) : (
              <Link href={c.href} className={styles.breadcrumbLink}>
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
