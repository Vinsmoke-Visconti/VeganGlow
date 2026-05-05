'use client';

import { useState } from 'react';
import type { SiteAssets } from '@/lib/admin/queries/settings';
import { createBrowserClient } from '@/lib/supabase/client';
import { setSystemSetting } from '@/app/actions/admin/settings';
import { toast } from 'sonner';
import { Upload, ImageIcon, Loader2, Save } from 'lucide-react';
import Image from 'next/image';
import styles from '../../settings.module.css';

const ASSET_LABELS: Record<keyof SiteAssets, string> = {
  hero_bg: 'Hình nền Trang chủ (Hero)',
  about_bg: 'Hình nền Trang giới thiệu (About)',
  auth_bg: 'Hình nền Đăng nhập / Đăng ký',
  cart_bg: 'Hình nền Giỏ hàng',
  contact_bg: 'Hình nền Liên hệ',
  profile_bg: 'Hình nền Cá nhân',
  products_bg: 'Hình nền Cửa hàng',
  support_bg: 'Hình nền Hỗ trợ / FAQ',
  wishlist_bg: 'Hình nền Yêu thích',
  blog_bg: 'Hình nền Blog / Cẩm nang',
  cta_bg: 'Hình nền Kêu gọi hành động (CTA)',
  logo_url: 'Logo chính (Dark)',
  logo_light_url: 'Logo phụ (Light)',
  footer_logo_url: 'Logo Footer',
  favicon_url: 'Favicon'
};

export function AppearanceClient({ initialAssets }: { initialAssets: SiteAssets }) {
  const [assets, setAssets] = useState<SiteAssets>(initialAssets);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserClient();

  const handleUpload = async (key: keyof SiteAssets, file: File) => {
    try {
      setUploading(key);
      const fileName = `${key}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage
        .from('system-assets')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('system-assets')
        .getPublicUrl(fileName);

      setAssets(prev => ({ ...prev, [key]: publicUrl }));
      toast.success(`Đã tải lên ${ASSET_LABELS[key]}`);
    } catch (err: any) {
      toast.error(`Lỗi tải lên: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await setSystemSetting('site_assets', assets);
    setSaving(false);
    if (res.ok) {
      toast.success('Đã lưu cài đặt giao diện thành công');
    } else {
      toast.error(`Lỗi: ${res.error}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {(Object.keys(ASSET_LABELS) as Array<keyof SiteAssets>).map((key) => (
          <div key={key} className={styles.assetCard}>
            <div className={styles.assetHeader}>
              <label className={styles.assetLabel}>{ASSET_LABELS[key]}</label>
              <div className={styles.uploadBtnWrap}>
                <input
                  type="file"
                  id={`upload-${key}`}
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(key, file);
                  }}
                />
                <label htmlFor={`upload-${key}`} className={styles.uploadBtn}>
                  {uploading === key ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  Tải lên
                </label>
              </div>
            </div>

            <div className={styles.previewContainer}>
              {assets[key] ? (
                <div className={styles.imageWrap}>
                  <Image 
                    src={assets[key]} 
                    alt={ASSET_LABELS[key]} 
                    fill 
                    className={styles.previewImage}
                    unoptimized
                  />
                </div>
              ) : (
                <div className={styles.noImage}>
                  <ImageIcon size={32} strokeWidth={1} />
                  <span>Chưa có hình ảnh</span>
                </div>
              )}
            </div>
            
            <input 
              type="text" 
              className={styles.urlInput}
              value={assets[key]}
              onChange={(e) => setAssets(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder="Hoặc dán URL hình ảnh tại đây..."
            />
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button 
          className={styles.saveBtn} 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Lưu thay đổi giao diện
        </button>
      </div>
    </div>
  );
}
