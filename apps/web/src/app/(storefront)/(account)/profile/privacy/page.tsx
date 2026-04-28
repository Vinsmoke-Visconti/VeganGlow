'use client';

import { useState } from 'react';
import { ShieldCheck, Eye, Lock, Smartphone, Globe, Bell } from 'lucide-react';
import styles from './privacy.module.css';

export default function PrivacyPage() {
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showPurchaseHistory: false,
    showOnlineStatus: true,
    allowTaggings: true,
    twoFactorAuth: false,
  });

  const toggleSetting = (key: keyof typeof privacySettings) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key]
    }));
  };

  return (
    <div className={styles.privacyWrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Thiết lập riêng tư</h1>
        <p className={styles.subtitle}>Kiểm soát thông tin nào của bạn được hiển thị và ai có thể tương tác với bạn</p>
      </header>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Chế độ hiển thị</h3>
        
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <div className={styles.settingLabel}>Hiển thị hồ sơ cá nhân</div>
            <div className={styles.settingDesc}>Cho phép người dùng khác tìm thấy và xem hồ sơ công khai của bạn</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={privacySettings.profileVisibility === 'public'} onChange={() => setPrivacySettings(prev => ({ ...prev, profileVisibility: prev.profileVisibility === 'public' ? 'private' : 'public' }))} />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <div className={styles.settingLabel}>Trạng thái online</div>
            <div className={styles.settingDesc}>Hiển thị khi bạn đang hoạt động trên hệ thống</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={privacySettings.showOnlineStatus} onChange={() => toggleSetting('showOnlineStatus')} />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Bảo mật tài khoản</h3>
        
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <div className={styles.settingLabel}>Xác thực 2 lớp (2FA)</div>
            <div className={styles.settingDesc}>Yêu cầu mã xác minh khi đăng nhập từ thiết bị lạ</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={privacySettings.twoFactorAuth} onChange={() => toggleSetting('twoFactorAuth')} />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <div className={styles.settingLabel}>Lịch sử đăng nhập</div>
            <div className={styles.settingDesc}>Xem danh sách các thiết bị đã đăng nhập tài khoản của bạn</div>
          </div>
          <button className={styles.textBtn}>Xem chi tiết</button>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Dữ liệu & Quảng cáo</h3>
        
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <div className={styles.settingLabel}>Quảng cáo cá nhân hóa</div>
            <div className={styles.settingDesc}>Nhận gợi ý sản phẩm dựa trên sở thích và hành vi mua sắm của bạn</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" defaultChecked />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.saveBtn}>Lưu thay đổi</button>
      </div>
    </div>
  );
}
