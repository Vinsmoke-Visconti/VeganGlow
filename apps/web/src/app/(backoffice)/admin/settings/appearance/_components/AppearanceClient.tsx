'use client';

import { useState } from 'react';
import type { SiteAssets } from '@/lib/admin/queries/settings';
import { createBrowserClient } from '@/lib/supabase/client';
import { setSystemSetting } from '@/app/actions/admin/settings';
import { toast } from 'sonner';
import { Upload, ImageIcon, Loader2, Save, Layout, Info, CheckCircle2, CloudUpload, Copy, X, Eye } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../settings.module.css';

const ASSET_LABELS: Record<keyof SiteAssets, { label: string; desc: string; section: string }> = {
  logo_url: { label: 'Logo chính (Nền sáng)', desc: 'Dùng trên Header trắng.', section: 'header' },
  logo_light_url: { label: 'Logo phụ (Nền tối)', desc: 'Dùng trên Header trong suốt/tối.', section: 'header' },
  favicon_url: { label: 'Favicon', desc: 'Icon trên tab trình duyệt.', section: 'header' },
  hero_bg: { label: 'Hình nền Hero', desc: 'Banner đầu trang chủ.', section: 'hero' },
  about_bg: { label: 'Hình nền Giới thiệu', desc: 'Nền trang câu chuyện thương hiệu.', section: 'content' },
  products_bg: { label: 'Hình nền Cửa hàng', desc: 'Nền trang danh sách sản phẩm.', section: 'products' },
  auth_bg: { label: 'Hình nền Đăng nhập', desc: 'Nền trang Login/Register.', section: 'auth' },
  cart_bg: { label: 'Hình nền Giỏ hàng', desc: 'Nền trang giỏ hàng.', section: 'cart' },
  blog_bg: { label: 'Hình nền Blog', desc: 'Nền trang cẩm nang.', section: 'content' },
  cta_bg: { label: 'Hình nền CTA', desc: 'Nền phần đăng ký newsletter.', section: 'footer' },
  footer_logo_url: { label: 'Logo Footer', desc: 'Logo ở chân trang.', section: 'footer' },
  contact_bg: { label: 'Hình nền Liên hệ', desc: 'Nền trang liên hệ.', section: 'content' },
  profile_bg: { label: 'Hình nền Cá nhân', desc: 'Nền trang cá nhân.', section: 'content' },
  support_bg: { label: 'Hình nền Hỗ trợ', desc: 'Nền trang FAQ.', section: 'content' },
  wishlist_bg: { label: 'Hình nền Yêu thích', desc: 'Nền trang yêu thích.', section: 'content' },
};

export function AppearanceClient({ initialAssets }: { initialAssets: SiteAssets }) {
  const [assets, setAssets] = useState<SiteAssets>(initialAssets);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'about' | 'shop' | 'auth' | 'cart' | 'blog' | 'contact' | 'profile' | 'support' | 'wishlist'>('home');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
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
      toast.success(`Đã tải lên ${ASSET_LABELS[key].label}`);
    } catch (err: any) {
      toast.error(`Lỗi tải lên: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleSaveIndividual = async (key: keyof SiteAssets) => {
    setSavingKey(key);
    const updatedAssets = { ...assets };
    const res = await setSystemSetting('site_assets', updatedAssets);
    setSavingKey(null);
    if (res.ok) {
      toast.success(`Đã lưu ${ASSET_LABELS[key].label}`);
    } else {
      toast.error(`Lỗi: ${res.error}`);
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    const res = await setSystemSetting('site_assets', assets);
    setSavingAll(false);
    if (res.ok) {
      toast.success('Đã lưu tất cả thay đổi');
    } else {
      toast.error(`Lỗi: ${res.error}`);
    }
  };

  const logoKeys: Array<keyof SiteAssets> = ['logo_url', 'logo_light_url', 'favicon_url'];
  const otherKeys = (Object.keys(ASSET_LABELS) as Array<keyof SiteAssets>).filter(k => !logoKeys.includes(k));

  const renderCard = (key: keyof SiteAssets) => {
    const isActive = hoveredKey === key || selectedKey === key;

    return (
      <div key={key} className={styles.assetCardWrapper}>
        <div className={styles.assetHeader}>
          <label className={styles.assetLabel}>{ASSET_LABELS[key].label}</label>
        </div>

        <motion.div 
          className={`${styles.assetMatrixCard} ${isActive ? styles.assetCardActive : ''}`}
          onMouseEnter={() => {
            setHoveredKey(key);
            if (!selectedKey) {
              setActiveSection(ASSET_LABELS[key].section);
              if (key === 'about_bg') setCurrentView('about');
              else if (key === 'products_bg') setCurrentView('shop');
              else if (key === 'auth_bg') setCurrentView('auth');
              else if (key === 'cart_bg') setCurrentView('cart');
              else if (key === 'blog_bg') setCurrentView('blog');
              else if (key === 'contact_bg') setCurrentView('contact');
              else if (key === 'profile_bg') setCurrentView('profile');
              else if (key === 'support_bg') setCurrentView('support');
              else if (key === 'wishlist_bg') setCurrentView('wishlist');
              else setCurrentView('home');
            }
          }}
          onMouseLeave={() => {
            setHoveredKey(null);
            if (!selectedKey) setActiveSection(null);
          }}
          onClick={() => {
            setSelectedKey(key);
            setActiveSection(ASSET_LABELS[key].section);
            if (key === 'about_bg') setCurrentView('about');
            else if (key === 'products_bg') setCurrentView('shop');
            else if (key === 'auth_bg') setCurrentView('auth');
            else if (key === 'cart_bg') setCurrentView('cart');
            else if (key === 'blog_bg') setCurrentView('blog');
            else if (key === 'contact_bg') setCurrentView('contact');
            else if (key === 'profile_bg') setCurrentView('profile');
            else if (key === 'support_bg') setCurrentView('support');
            else if (key === 'wishlist_bg') setCurrentView('wishlist');
            else setCurrentView('home');
          }}
          layout
        >
          {/* MATRIX GRID [1-16] */}
          <div className={styles.matrixGrid}>
            {/* cells 1,2,3, 5,6,7, 9,10,11: Image Preview */}
            <div className={styles.matrixPreview}>
              {assets[key] ? (
                <Image src={assets[key]!} alt={ASSET_LABELS[key].label} fill className={styles.matrixActualImage} unoptimized />
              ) : (
                <div className={styles.matrixNoImage}><ImageIcon size={20} strokeWidth={1} /></div>
              )}
            </div>

            {/* cell 4: View Full */}
            <button className={styles.matrixBtn4} onClick={(e) => { e.stopPropagation(); setSelectedPreview(assets[key] || null); }}>
              <Eye size={16} />
            </button>

            {/* cell 8: Import */}
            <div className={styles.matrixBtn8}>
              <input type="file" id={`mt-up-${key}`} hidden accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(key, file);
              }} />
              <label htmlFor={`mt-up-${key}`} onClick={(e) => e.stopPropagation()}>
                {uploading === key ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              </label>
            </div>

            {/* cell 12: Download (Save) */}
            <button className={styles.matrixBtn12} onClick={(e) => { e.stopPropagation(); handleSaveIndividual(key); }} disabled={savingKey === key}>
              {savingKey === key ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            </button>

            {/* cells 13,14,15: URL Bar */}
            <div className={styles.matrixUrlBar} onClick={(e) => e.stopPropagation()}>
              <input 
                type="text" 
                value={assets[key] || ''} 
                onChange={(e) => setAssets(prev => ({ ...prev, [key]: e.target.value }))}
                onFocus={(e) => e.target.select()}
                placeholder="Link..."
              />
            </div>

            {/* cell 16: Copy */}
            <button className={styles.matrixBtn16} onClick={(e) => {
              e.stopPropagation();
              if (assets[key]) { navigator.clipboard.writeText(assets[key]!); toast.success('Đã copy!'); }
            }}>
              <Copy size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const isKeyActive = (key: string | string[]) => {
    const keys = Array.isArray(key) ? key : [key];
    return keys.some(k => hoveredKey === k || selectedKey === k);
  };

  return (
    <div className={styles.appearanceLayoutReverse}>
      {/* Simulation Side */}
      <div className={styles.mainPreview}>
        <div className={styles.stickyPreviewFull}>
          <div className={styles.blueprintMap}>
            <div className={styles.blueprintOverlay}>MASTER_ARCHITECTURE_V5</div>
            
            <div className={styles.miniBrowserTop}>
              <div className={styles.dots}><span/><span/><span/></div>
              <div className={styles.addressBar}>
                veganglow.vn{currentView === 'home' ? '' : currentView === 'shop' ? '/products' : `/${currentView}`}
              </div>
            </div>

            <div className={styles.viewTabs}>
              {([
                { id: 'home', path: '/' },
                { id: 'about', path: '/about' },
                { id: 'shop', path: '/products' },
                { id: 'auth', path: '/auth' },
                { id: 'cart', path: '/cart' },
                { id: 'profile', path: '/profile' },
                { id: 'support', path: '/support' },
                { id: 'wishlist', path: '/wishlist' },
                { id: 'contact', path: '/contact' },
                { id: 'blog', path: '/blog' }
              ] as const).map(v => (
                <button 
                  key={v.id} 
                  className={`${styles.viewTab} ${currentView === v.id ? styles.viewTabActive : ''}`}
                  onClick={() => setCurrentView(v.id as any)}
                >
                  {v.path}
                </button>
              ))}
            </div>

            <div className={styles.blueprintScroll}>
              {/* CURRENT PAGE VIEW - FLEX 1 */}
              <div className={`${styles.bpSectionGroup} ${styles.bpSectionActive}`} style={{ flex: 1 }}>
                <div className={styles.skLabel}>Page: {currentView === 'shop' ? '/products' : `/${currentView}`}</div>
                
                {currentView === 'home' && (
                  <div className={`${styles.skeletonFullPage} ${isKeyActive('hero_bg') ? styles.activeHatch : ''}`} style={{ padding: 0, minHeight: '180px' }}>
                    <div className={styles.skHeaderFloating}>
                      <div className={`${styles.skLogo} ${isKeyActive(['logo_url', 'logo_light_url']) ? styles.activeHatch : ''}`} />
                      <div className={styles.skNav}><span/><span/></div>
                      <div className={styles.skHeaderRight}><div className={styles.skIcons}><span/><span/></div></div>
                    </div>
                    <div className={styles.skHeroContent} style={{ padding: '20px' }}>
                      <div className={styles.skBadge} style={{ width: '100px' }} />
                      <div className={styles.skHeroTitle} style={{ height: '24px' }} />
                    </div>
                    <div className={styles.skStatsBar} style={{ height: '40px' }}>
                      {[1,2,3,4].map(i => <div key={i} className={styles.skStatItem} />)}
                    </div>
                    <div className={`${styles.skCTABox} ${isKeyActive('cta_bg') ? styles.activeHatch : ''}`} style={{ height: '60px', marginTop: '10px' }}>
                      <div className={styles.skHeroTitle} style={{ width: '30%', height: '12px' }} />
                    </div>
                  </div>
                )}

                {currentView === 'about' && (
                  <div className={`${styles.skeletonFullPage} ${isKeyActive('about_bg') ? styles.activeHatch : ''}`}>
                    <div className={styles.skAboutLayout}>
                      <div className={styles.skAboutText} />
                      <div className={styles.skAboutVisual} />
                    </div>
                  </div>
                )}

                {currentView === 'shop' && (
                  <div className={`${styles.skeletonFullPage} ${isKeyActive('products_bg') ? styles.activeHatch : ''}`}>
                    <div className={styles.skProductGridLarge}>
                      {[1,2,3,4,5,6].map(i => <div key={i} className={styles.skCard} />)}
                    </div>
                  </div>
                )}

                {currentView === 'profile' && (
                  <div className={`${styles.skeletonFullPage} ${isKeyActive('profile_bg') ? styles.activeHatch : ''}`}>
                    <div className={styles.skProfileLayout}>
                      <div className={styles.skProfileSide} />
                      <div className={styles.skProfileMain}>
                        <div className={styles.skInput} /><div className={styles.skInput} />
                      </div>
                    </div>
                  </div>
                )}

                {currentView === 'support' && (
                  <div className={`${styles.skeletonFullPage} ${isKeyActive('support_bg') ? styles.activeHatch : ''}`}>
                    <div className={styles.skSupportGrid}>
                      {[1,2,3,4].map(i => <div key={i} className={styles.skFaqItem} />)}
                    </div>
                  </div>
                )}

                {currentView === 'wishlist' && (
                  <div className={`${styles.skeletonFullPage} ${isKeyActive('wishlist_bg') ? styles.activeHatch : ''}`}>
                    <div className={styles.skProductGridLarge}>
                      {[1,2,3].map(i => <div key={i} className={styles.skCard} />)}
                    </div>
                  </div>
                )}

                {currentView === 'contact' && (
                  <div className={`${styles.skeletonFullPage} ${isKeyActive('contact_bg') ? styles.activeHatch : ''}`}>
                    <div className={styles.skContactLayout}>
                      <div className={styles.skContactForm} />
                      <div className={styles.skContactInfo} />
                    </div>
                  </div>
                )}

                {currentView === 'blog' && (
                  <div className={`${styles.skeletonFullPage} ${isKeyActive('blog_bg') ? styles.activeHatch : ''}`}>
                    <div className={styles.skBlogList}>
                      {[1,2,3].map(i => <div key={i} className={styles.skBlogItem} />)}
                    </div>
                  </div>
                )}

                {currentView === 'auth' && (
                  <div className={`${styles.skeletonFullPage} ${isKeyActive('auth_bg') ? styles.activeHatch : ''}`}>
                    <div className={styles.skAuthCard}>
                      <div className={styles.skInput} /><div className={styles.skInput} />
                      <div className={styles.skPrimaryBtn} />
                    </div>
                  </div>
                )}

                {currentView === 'cart' && (
                  <div className={`${styles.skeletonFullPage} ${isKeyActive('cart_bg') ? styles.activeHatch : ''}`}>
                    <div className={styles.skCartList}>
                      {[1,2].map(i => <div key={i} className={styles.skCartItem} />)}
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER VIEW - FLEX 0.3 */}
              <div className={`${styles.bpSectionGroup} ${activeSection === 'footer' ? styles.bpSectionActive : ''}`} style={{ marginTop: 'auto', flex: 0.3 }}>
                <div className={styles.skLabel}>Footer</div>
                <div className={styles.skeletonFooter}>
                  <div className={styles.skFooterTop}>
                    <div className={`${styles.skFooterLogo} ${isKeyActive('footer_logo_url') ? styles.activeHatch : ''}`} />
                    <div className={styles.skFooterCols}>
                      {[1,2,3].map(i => (
                        <div key={i} className={styles.skFooterCol}>
                          <div className={styles.skStatItem} style={{ height: '8px', width: '40px', marginBottom: '8px' }} />
                          <div className={styles.skStatItem} style={{ height: '6px', width: '60px' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.skFooterBottomLine} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Cards on the RIGHT Sidebar */}
      <aside className={styles.assetSidebar}>
        <div className={styles.sidebarHeader}>
          <h4 className={styles.sidebarTitle}>Cấu hình hình ảnh</h4>
          <button className={styles.saveAllBtn} onClick={handleSaveAll} disabled={savingAll}>
            {savingAll ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Lưu tất cả
          </button>
        </div>

        <div className={styles.sidebarScrollArea}>
          <div className={styles.sidebarScrollContent}>
            <div className={styles.sidebarSection}>
              <p className={styles.sidebarSectionLabel}>Thương hiệu & Nhận diện</p>
              <div className={styles.assetGrid}>
                {logoKeys.map(key => renderCard(key))}
              </div>
            </div>
            
            <div className={styles.sidebarSection}>
              <p className={styles.sidebarSectionLabel}>Giao diện chính (Storefront)</p>
              <div className={styles.assetGrid}>
                {otherKeys.map(key => renderCard(key))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedPreview && (
          <motion.div 
            className={styles.lightboxOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPreview(null)}
          >
            <button className={styles.closeLightbox} onClick={() => setSelectedPreview(null)}>
              <X size={24} />
            </button>
            <motion.div 
              className={styles.lightboxContent}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedPreview} 
                alt="Full Preview" 
                className={styles.lightboxImage}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
