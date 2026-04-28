'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Package, LogOut, Ticket } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { logout } from '@/app/actions/auth';
import styles from './UserAccount.module.css';

export default function UserAccountSidebar() {
  const pathname = usePathname();
  const supabase = createBrowserClient();
  const [profile, setProfile] = useState<{ full_name: string | null; username: string | null } | null>(null);
  const [tier, setTier] = useState('Thành viên');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();
      
      setProfile(data);

      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      const orderCount = count || 0;
      if (orderCount >= 10) setTier('Hạng Vàng');
      else if (orderCount >= 5) setTier('Hạng Bạc');
      else if (orderCount >= 1) setTier('Thành viên mới');
    })();
  }, [supabase]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.userProfile}>
        <div className={styles.avatar}>
          <User size={28} />
        </div>
        <div className={styles.userInfo}>
          <h3 className={styles.userName}>{profile?.username || 'Thành viên'}</h3>
          <Link href="/profile" className={styles.editProfile}>
            Sửa hồ sơ
          </Link>
        </div>
      </div>

      <nav className={styles.menu}>
        <div className={styles.menuGroup}>
          <div className={styles.groupHeader}>
            <User size={18} />
            <span>Tài khoản của tôi</span>
          </div>
          <div className={styles.groupItems}>
            <Link href="/profile" className={`${styles.navLink} ${pathname === '/profile' ? styles.navLinkActive : ''}`}>
              Hồ sơ
            </Link>
            <Link href="/profile/bank" className={`${styles.navLink} ${pathname === '/profile/bank' ? styles.navLinkActive : ''}`}>
              Ngân hàng
            </Link>
            <Link href="/profile/address" className={`${styles.navLink} ${pathname === '/profile/address' ? styles.navLinkActive : ''}`}>
              Địa chỉ
            </Link>
            <Link href="/profile/password" className={`${styles.navLink} ${pathname === '/profile/password' ? styles.navLinkActive : ''}`}>
              Đổi mật khẩu
            </Link>
            <Link href="/profile/notifications" className={`${styles.navLink} ${pathname === '/profile/notifications' ? styles.navLinkActive : ''}`}>
              Cài đặt thông báo
            </Link>
            <Link href="/profile/privacy" className={`${styles.navLink} ${pathname === '/profile/privacy' ? styles.navLinkActive : ''}`}>
              Riêng tư
            </Link>
          </div>
        </div>

        <div className={styles.menuGroup}>
          <Link href="/orders" className={`${styles.groupHeader} ${pathname === '/orders' ? styles.navLinkActive : ''}`}>
            <Package size={18} />
            <span>Đơn Mua</span>
          </Link>
        </div>

        <div className={styles.menuGroup}>
          <Link href="/vouchers" className={`${styles.groupHeader} ${pathname === '/vouchers' ? styles.navLinkActive : ''}`}>
            <Ticket size={18} />
            <span>Kho Voucher</span>
          </Link>
        </div>

        <button onClick={handleLogout} className={`${styles.groupHeader} ${styles.logoutBtn}`} style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border-light)', paddingTop: '1rem' }}>
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
      </nav>
    </aside>
  );
}
