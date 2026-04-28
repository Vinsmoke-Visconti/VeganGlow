'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  Megaphone,
  Ticket,
  Image as ImageIcon,
  Zap,
  Calendar,
  Plus,
  Eye,
  Edit,
  Sparkles,
  Loader2,
} from 'lucide-react';
import sharedStyles from '../admin-shared.module.css';
import styles from './marketing.module.css';

type Tab = 'vouchers' | 'banners' | 'flash';

type Voucher = {
  id: string;
  code: string;
  title: string;
  discount_type: 'percent' | 'fixed' | 'shipping';
  discount_value: number;
  min_order: number;
  quota: number;
  used_count: number;
  expires_at: string | null;
  status: 'active' | 'scheduled' | 'expired' | 'draft';
};

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  cover_gradient: string | null;
  image_url: string | null;
  placement: string;
  status: 'active' | 'scheduled' | 'draft' | 'archived';
  starts_at: string | null;
  ends_at: string | null;
};

const FLASH_DEMO = [
  {
    name: 'Flash Sale 12.12 — 24h vàng',
    products: 18,
    discount: '30-50%',
    countdown: '14:32:08',
    status: 'live' as const,
    revenue: 12_400_000,
  },
  {
    name: 'Happy Hour mỗi tối 20-22h',
    products: 6,
    discount: '15%',
    countdown: 'Tối nay 20:00',
    status: 'recurring' as const,
    revenue: 850_000,
  },
];

const STATUS_LABEL: Record<string, string> = {
  active: 'Đang chạy',
  scheduled: 'Đã lên lịch',
  draft: 'Bản nháp',
  expired: 'Hết hạn',
  archived: 'Đã lưu trữ',
  live: 'Đang LIVE',
  recurring: 'Lặp lại',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'badgeSuccess',
  scheduled: 'badgeInfo',
  draft: 'badgeNeutral',
  expired: 'badgeDanger',
  archived: 'badgeNeutral',
  live: 'badgeSuccess',
  recurring: 'badgeShipping',
};

const PLACEMENT_LABEL: Record<string, string> = {
  home_hero: 'Trang chủ — Hero',
  home_sub: 'Trang chủ — Sub-banner',
  blog_index: 'Blog index',
  category_top: 'Đầu trang Danh mục',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export default function AdminMarketing() {
  const supabase = createBrowserClient();
  const [tab, setTab] = useState<Tab>('vouchers');
  const [vouchers, setVouchers] = useState<Voucher[] | null>(null);
  const [banners, setBanners] = useState<Banner[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [vRes, bRes] = await Promise.all([
        supabase
          .from('vouchers')
          .select(
            'id, code, title, discount_type, discount_value, min_order, quota, used_count, expires_at, status',
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('banners')
          .select('id, title, subtitle, cover_gradient, image_url, placement, status, starts_at, ends_at')
          .order('display_order', { ascending: true }),
      ]);

      if (!alive) return;
      setVouchers((vRes.data as Voucher[]) || []);
      setBanners((bRes.data as Banner[]) || []);
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  const activeVouchers = (vouchers || []).filter((v) => v.status === 'active');
  const totalUsed = (vouchers || []).reduce((sum, v) => sum + v.used_count, 0);
  const activeBanners = (banners || []).filter((b) => b.status === 'active');

  return (
    <div className={sharedStyles.page}>
      <header className={sharedStyles.pageHeader}>
        <div>
          <h1 className={sharedStyles.pageTitle}>Tiếp thị & Khuyến mãi</h1>
          <p className={sharedStyles.pageSubtitle}>
            Quản lý voucher, banner trang chủ và Flash Sale.
          </p>
        </div>
        <button
          className={sharedStyles.btnDark}
          onClick={() => alert('Bản đầy đủ sẽ mở modal Add — đây là demo MIS.')}
        >
          <Plus size={18} />
          {tab === 'vouchers' && 'Tạo voucher mới'}
          {tab === 'banners' && 'Thêm banner'}
          {tab === 'flash' && 'Lên lịch Flash Sale'}
        </button>
      </header>

      {/* Stats row */}
      <div className={sharedStyles.statsRow}>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Voucher đang hoạt động</div>
          <div className={sharedStyles.statValue}>
            {vouchers === null ? '—' : activeVouchers.length}
          </div>
        </div>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Lượt sử dụng</div>
          <div className={sharedStyles.statValue}>
            {vouchers === null ? '—' : totalUsed}
          </div>
        </div>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Banner đang chạy</div>
          <div className={sharedStyles.statValue}>
            {banners === null ? '—' : activeBanners.length}
          </div>
        </div>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Flash Sale</div>
          <div
            className={sharedStyles.statValue}
            style={{ fontSize: 'var(--text-base)', whiteSpace: 'nowrap' }}
          >
            {FLASH_DEMO.filter((f) => f.status === 'live').length} đang LIVE
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'vouchers'}
          className={`${styles.tab} ${tab === 'vouchers' ? styles.tabActive : ''}`}
          onClick={() => setTab('vouchers')}
        >
          <Ticket size={16} />
          Voucher
        </button>
        <button
          role="tab"
          aria-selected={tab === 'banners'}
          className={`${styles.tab} ${tab === 'banners' ? styles.tabActive : ''}`}
          onClick={() => setTab('banners')}
        >
          <ImageIcon size={16} />
          Banner trang chủ
        </button>
        <button
          role="tab"
          aria-selected={tab === 'flash'}
          className={`${styles.tab} ${tab === 'flash' ? styles.tabActive : ''}`}
          onClick={() => setTab('flash')}
        >
          <Zap size={16} />
          Flash Sale
        </button>
      </div>

      {/* Vouchers */}
      {tab === 'vouchers' && (
        vouchers === null ? (
          <Loading label="Đang tải voucher..." />
        ) : vouchers.length === 0 ? (
          <Empty
            icon={<Ticket size={28} />}
            title="Chưa có voucher nào"
            desc="Tạo voucher đầu tiên để khách hàng có thể áp dụng khi checkout."
          />
        ) : (
          <div className={styles.voucherGrid}>
            {vouchers.map((v) => (
              <div key={v.id} className={styles.voucherCard}>
                <div className={styles.voucherLeft}>
                  <span className={styles.voucherIcon}>
                    <Ticket size={18} />
                  </span>
                  <div className={styles.voucherDashed} />
                </div>
                <div className={styles.voucherBody}>
                  <div className={styles.voucherTop}>
                    <code className={styles.voucherCode}>{v.code}</code>
                    <span
                      className={`${sharedStyles.badge} ${sharedStyles[STATUS_BADGE[v.status] || 'badgeNeutral']}`}
                    >
                      {STATUS_LABEL[v.status]}
                    </span>
                  </div>
                  <div className={styles.voucherTitle}>{v.title}</div>
                  <div className={styles.voucherMeta}>
                    <span>
                      Đơn tối thiểu:{' '}
                      <strong>
                        {v.min_order ? `${Number(v.min_order).toLocaleString('vi-VN')}đ` : 'Không'}
                      </strong>
                    </span>
                    <span className={styles.voucherDot}>•</span>
                    <span>
                      HSD: <strong>{formatDate(v.expires_at)}</strong>
                    </span>
                  </div>
                  <div className={styles.voucherProgress}>
                    <div className={styles.voucherProgressBar}>
                      <div
                        className={styles.voucherProgressFill}
                        style={{
                          width: `${v.quota > 0 ? Math.min(100, (v.used_count / v.quota) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <span className={styles.voucherProgressLabel}>
                      {v.used_count} / {v.quota || '∞'} lượt
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Banners */}
      {tab === 'banners' && (
        banners === null ? (
          <Loading label="Đang tải banner..." />
        ) : banners.length === 0 ? (
          <Empty
            icon={<ImageIcon size={28} />}
            title="Chưa có banner nào"
            desc="Thêm banner để hiển thị trên trang chủ và các vị trí ưu tiên."
          />
        ) : (
          <div className={styles.bannerGrid}>
            {banners.map((b) => (
              <div key={b.id} className={styles.bannerCard}>
                <div
                  className={styles.bannerCover}
                  style={
                    b.image_url
                      ? {
                          background: `center / cover no-repeat url(${JSON.stringify(b.image_url)})`,
                        }
                      : { background: b.cover_gradient || 'var(--gradient-primary)' }
                  }
                >
                  {!b.image_url && <Sparkles size={32} className={styles.bannerCoverIcon} />}
                </div>
                <div className={styles.bannerBody}>
                  <div className={styles.bannerTop}>
                    <h3 className={styles.bannerTitle}>{b.title}</h3>
                    <span
                      className={`${sharedStyles.badge} ${sharedStyles[STATUS_BADGE[b.status] || 'badgeNeutral']}`}
                    >
                      {STATUS_LABEL[b.status]}
                    </span>
                  </div>
                  {b.subtitle && <p className={styles.bannerDesc}>{b.subtitle}</p>}
                  <div className={styles.bannerMeta}>
                    <span className={styles.bannerMetaItem}>
                      <ImageIcon size={13} /> {PLACEMENT_LABEL[b.placement] || b.placement}
                    </span>
                    <span className={styles.bannerMetaItem}>
                      <Calendar size={13} />
                      {b.starts_at || b.ends_at
                        ? `${formatDate(b.starts_at)} → ${formatDate(b.ends_at)}`
                        : 'Chưa lên lịch'}
                    </span>
                  </div>
                  <div className={styles.bannerActions}>
                    <button className={sharedStyles.btnOutline}>
                      <Eye size={14} /> Xem
                    </button>
                    <button className={sharedStyles.btnOutline}>
                      <Edit size={14} /> Sửa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Flash Sale (still demo until a flash_sales table is added) */}
      {tab === 'flash' && (
        <div className={sharedStyles.card}>
          <div className={sharedStyles.tableScroll}>
            <table className={sharedStyles.table}>
              <thead>
                <tr>
                  <th>Tên chiến dịch</th>
                  <th>Sản phẩm</th>
                  <th>Mức giảm</th>
                  <th>Đếm ngược / Lịch</th>
                  <th>Doanh thu</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {FLASH_DEMO.map((f) => (
                  <tr key={f.name}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{f.name}</span>
                    </td>
                    <td>{f.products} SP</td>
                    <td>
                      <span
                        className={`${sharedStyles.badge} ${sharedStyles.badgeDanger}`}
                        style={{ fontWeight: 700 }}
                      >
                        -{f.discount}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          color: 'var(--color-primary-dark)',
                        }}
                      >
                        {f.countdown}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {f.revenue.toLocaleString('vi-VN')}đ
                    </td>
                    <td>
                      <span
                        className={`${sharedStyles.badge} ${sharedStyles[STATUS_BADGE[f.status]]}`}
                      >
                        {STATUS_LABEL[f.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className={styles.note}>
        <Megaphone size={14} />
        <span>
          Voucher & banner đọc từ Supabase qua RLS · Flash Sale còn là mock cho bản MIS.
        </span>
      </div>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className={sharedStyles.card}>
      <div className={sharedStyles.loadingState}>
        <Loader2 className="animate-spin" size={22} />
        {label}
      </div>
    </div>
  );
}

function Empty({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className={sharedStyles.card}>
      <div
        className={sharedStyles.emptyState}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
      >
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--color-primary-50)',
            color: 'var(--color-primary-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
        <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>
          {title}
        </div>
        <div style={{ maxWidth: 360 }}>{desc}</div>
      </div>
    </div>
  );
}
