'use client';

import { useState } from 'react';
import { Store, Bell, Shield, Layout, Globe, Palette } from 'lucide-react';
import type { BrandInfo } from '@/lib/admin/queries/settings';
import shared from '../../admin-shared.module.css';
import styles from '../settings.module.css';
import { BrandTab } from './BrandTab';

type TabKey = 'brand' | 'storefront' | 'notifications' | 'security';

const TABS: { key: TabKey; icon: React.ReactNode; label: string; desc: string }[] = [
  { key: 'brand', icon: <Store size={18} />, label: 'Thương hiệu', desc: 'Nhận diện & liên hệ' },
  { key: 'storefront', icon: <Layout size={18} />, label: 'Giao diện', desc: 'Storefront & Admin' },
  { key: 'notifications', icon: <Bell size={18} />, label: 'Thông báo', desc: 'Email & Push' },
  { key: 'security', icon: <Shield size={18} />, label: 'Bảo mật', desc: 'Mật khẩu & 2FA' },
];

import { useTheme } from 'next-themes';
import { useEffect, useState as useReactState } from 'react';

export function SettingsClient({ brand }: { brand: BrandInfo }) {
  const [active, setActive] = useState<TabKey>('brand');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useReactState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className={styles.layout}>
      {/* Side Navigation */}
      <nav className={styles.sideNav}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.sideItem} ${active === t.key ? styles.sideItemActive : ''}`}
            onClick={() => setActive(t.key)}
          >
            <div className={styles.sideItemIcon}>{t.icon}</div>
            <div className={styles.sideItemBody}>
              <span className={styles.sideItemLabel}>{t.label}</span>
              <span className={styles.sideItemDesc}>{t.desc}</span>
            </div>
          </button>
        ))}
      </nav>

      {/* Content area */}
      <div className={styles.content}>
        {active === 'brand' && <BrandTab initial={brand} />}

        {active === 'storefront' && (
          <div className={styles.settingsCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}><Layout size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: 'var(--vg-leaf-600)' }} />Cài đặt giao diện</h3>
              <p className={styles.cardDesc}>Tùy chỉnh giao diện hiển thị cho Storefront và Admin Dashboard.</p>
            </div>
            <div className={styles.cardBody}>
               <div className={styles.toggleRow}>
                 <div className={styles.toggleText}>
                   <div className={styles.toggleTitle}><Palette size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Chế độ tối (Dark Mode)</div>
                   <div className={styles.toggleDesc}>Bật giao diện tối cho Admin Dashboard. Không ảnh hưởng Storefront.</div>
                 </div>
                 <button 
                   type="button" 
                   className={`${styles.toggle} ${mounted && isDark ? styles.toggleOn : ''}`}
                   onClick={() => setTheme(isDark ? 'light' : 'dark')}
                 >
                   <span className={styles.toggleThumb} />
                 </button>
               </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <div className={styles.toggleTitle}><Globe size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Hiển thị banner khuyến mãi</div>
                  <div className={styles.toggleDesc}>Hiển thị thanh banner trên đầu trang Storefront cho các chương trình khuyến mãi.</div>
                </div>
                <button type="button" className={`${styles.toggle} ${styles.toggleOn}`}>
                  <span className={styles.toggleThumb} />
                </button>
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <div className={styles.toggleTitle}>Chế độ bảo trì</div>
                  <div className={styles.toggleDesc}>Tạm ngưng Storefront, hiển thị trang &quot;Đang bảo trì&quot; cho khách hàng.</div>
                </div>
                <button type="button" className={styles.toggle}>
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            </div>
          </div>
        )}

        {active === 'notifications' && (
          <div className={styles.settingsCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}><Bell size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: 'var(--vg-leaf-600)' }} />Thông báo hệ thống</h3>
              <p className={styles.cardDesc}>Quản lý cách hệ thống gửi thông báo đến nhân sự và khách hàng.</p>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <div className={styles.toggleTitle}>Email đơn hàng mới</div>
                  <div className={styles.toggleDesc}>Gửi email thông báo khi có đơn hàng mới cho admin.</div>
                </div>
                <button type="button" className={`${styles.toggle} ${styles.toggleOn}`}>
                  <span className={styles.toggleThumb} />
                </button>
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <div className={styles.toggleTitle}>Email xác nhận đơn cho khách</div>
                  <div className={styles.toggleDesc}>Tự động gửi email xác nhận khi khách hàng đặt đơn thành công.</div>
                </div>
                <button type="button" className={`${styles.toggle} ${styles.toggleOn}`}>
                  <span className={styles.toggleThumb} />
                </button>
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <div className={styles.toggleTitle}>Thông báo hết hàng</div>
                  <div className={styles.toggleDesc}>Gửi cảnh báo khi sản phẩm sắp hết hoặc đã hết hàng.</div>
                </div>
                <button type="button" className={styles.toggle}>
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            </div>
          </div>
        )}

        {active === 'security' && (
          <div className={styles.settingsCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}><Shield size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: 'var(--vg-leaf-600)' }} />Bảo mật hệ thống</h3>
              <p className={styles.cardDesc}>Cấu hình bảo mật cho tài khoản admin và chính sách đăng nhập.</p>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <div className={styles.toggleTitle}>Xác thực 2 bước (2FA)</div>
                  <div className={styles.toggleDesc}>Yêu cầu mã xác thực từ ứng dụng Authenticator khi đăng nhập Admin.</div>
                </div>
                <button type="button" className={styles.toggle} disabled>
                  <span className={styles.toggleThumb} />
                </button>
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <div className={styles.toggleTitle}>Khóa tài khoản sau 5 lần nhập sai</div>
                  <div className={styles.toggleDesc}>Tự động khóa tài khoản 15 phút nếu đăng nhập thất bại liên tiếp.</div>
                </div>
                <button type="button" className={`${styles.toggle} ${styles.toggleOn}`}>
                  <span className={styles.toggleThumb} />
                </button>
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <div className={styles.toggleTitle}>Ghi nhật ký đăng nhập</div>
                  <div className={styles.toggleDesc}>Lưu lại IP, thời gian và thiết bị mỗi khi có phiên đăng nhập mới.</div>
                </div>
                <button type="button" className={`${styles.toggle} ${styles.toggleOn}`}>
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
