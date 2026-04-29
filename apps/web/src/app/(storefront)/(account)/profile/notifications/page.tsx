'use client';

import { useState, useEffect, Suspense } from 'react';
import { Bell, ShieldCheck, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import styles from './notifications.module.css';

function NotificationsContent() {
  const [settings, setSettings] = useState({
    order_updates: true,
    promo_emails: false,
    wallet_updates: true,
    chat_notifications: true,
    newsletters: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
      } else if (data) {
        const row = data as any;
        setSettings({
          order_updates: !!row.order_updates,
          promo_emails: !!row.promo_emails,
          wallet_updates: !!row.wallet_updates,
          chat_notifications: !!row.chat_notifications,
          newsletters: !!row.newsletters,
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [supabase]);

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await (supabase.from('user_settings') as any).upsert({
      user_id: user.id,
      ...settings,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert('Lỗi khi lưu cài đặt: ' + error.message);
    } else {
      alert('Đã lưu cài đặt thành công!');
    }
    setSaving(false);
  }

  if (loading) return <div className={styles.loading}>Đang tải...</div>;

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Cài đặt thông báo</h1>
        <p className={styles.subtitle}>Chọn loại thông báo bạn muốn nhận qua Email hoặc Ứng dụng</p>
      </header>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Thông báo Email</h3>
        
        <div className={styles.item}>
          <div className={styles.info}>
            <div className={styles.label}>Cập nhật đơn hàng</div>
            <div className={styles.desc}>Nhận thông báo về trạng thái đơn hàng và thanh toán</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={settings.order_updates} onChange={() => toggle('order_updates')} />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.item}>
          <div className={styles.info}>
            <div className={styles.label}>Khuyến mãi & Ưu đãi</div>
            <div className={styles.desc}>Nhận thông tin về các chương trình giảm giá và mã voucher mới</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={settings.promo_emails} onChange={() => toggle('promo_emails')} />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.item}>
          <div className={styles.info}>
            <div className={styles.label}>Bản tin VeganGlow</div>
            <div className={styles.desc}>Cập nhật tin tức và bài viết mới từ blog làm đẹp thuần chay</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={settings.newsletters} onChange={() => toggle('newsletters')} />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Thông báo đẩy (Push)</h3>
        
        <div className={styles.item}>
          <div className={styles.info}>
            <div className={styles.label}>Tin nhắn Chat</div>
            <div className={styles.desc}>Nhận thông báo khi có tin nhắn mới từ đội ngũ hỗ trợ</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={settings.chat_notifications} onChange={() => toggle('chat_notifications')} />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.item}>
          <div className={styles.info}>
            <div className={styles.label}>Hoạt động tài khoản</div>
            <div className={styles.desc}>Thông báo về đăng nhập và các thay đổi quan trọng của tài khoản</div>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={settings.wallet_updates} onChange={() => toggle('wallet_updates')} />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      <div className={styles.footer}>
        <button 
          className={styles.saveBtn} 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className={styles.spin} size={18} /> : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Khởi tạo cài đặt...</div>}>
      <NotificationsContent />
    </Suspense>
  );
}
