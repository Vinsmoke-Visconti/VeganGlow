'use client';

import { useState, useEffect } from 'react';
import { Ticket, Clock, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase/client';
import styles from './vouchers.module.css';

interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_type: 'shipping' | 'percentage' | 'fixed';
  end_date: string;
  is_used?: boolean;
}

export default function VouchersPage() {
  const [filter, setFilter] = useState('all');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchVouchers();
  }, []);

  async function fetchVouchers() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Join user_vouchers with vouchers
    const { data, error } = await supabase
      .from('user_vouchers')
      .select(`
        is_used,
        vouchers (
          id,
          code,
          title,
          description,
          discount_type,
          end_date
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching vouchers:', error);
    } else {
      const flattened = data.map((item: any) => ({
        ...item.vouchers,
        is_used: item.is_used
      }));
      setVouchers(flattened);
    }
    setLoading(false);
  }

  const filteredVouchers = vouchers.filter(v => {
    if (filter === 'all') return true;
    if (filter === 'shipping') return v.discount_type === 'shipping';
    if (filter === 'discount') return v.discount_type === 'percentage' || v.discount_type === 'fixed';
    return true;
  });

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Kho Voucher</h1>
          <div className={styles.addVoucher}>
            <input type="text" placeholder="Nhập mã voucher tại đây" className={styles.voucherInput} />
            <button className={styles.applyBtn}>Lưu</button>
          </div>
        </div>
        
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${filter === 'all' ? styles.tabActive : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
          <button className={`${styles.tab} ${filter === 'shipping' ? styles.tabActive : ''}`} onClick={() => setFilter('shipping')}>Vận chuyển</button>
          <button className={`${styles.tab} ${filter === 'discount' ? styles.tabActive : ''}`} onClick={() => setFilter('discount')}>Giảm giá</button>
        </div>
      </header>

      <div className={styles.voucherGrid}>
        {loading ? (
          <div className={styles.loading}>Đang tải voucher...</div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredVouchers.length > 0 ? filteredVouchers.map(v => (
              <motion.div 
                key={v.id} 
                className={styles.voucherCard}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
              >
                <div className={`${styles.cardLeft} ${v.discount_type === 'shipping' ? styles.typeShipping : styles.typeDiscount}`}>
                  {v.discount_type === 'shipping' ? <Clock size={32} /> : <Tag size={32} />}
                  <span className={styles.typeLabel}>{v.discount_type === 'shipping' ? 'Vận chuyển' : 'Giảm giá'}</span>
                </div>
                <div className={styles.cardRight}>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.voucherTitle}>{v.title}</h3>
                    <p className={styles.voucherDesc}>{v.description}</p>
                    <div className={styles.voucherFooter}>
                      <span className={styles.expiry}>HSD: {new Date(v.end_date).toLocaleDateString('vi-VN')}</span>
                      <button className={styles.useBtn} disabled={v.is_used}>
                        {v.is_used ? 'Đã dùng' : 'Dùng ngay'}
                      </button>
                    </div>
                  </div>
                  <div className={styles.cardTag}>Số lượng có hạn</div>
                </div>
                <div className={styles.circles}>
                  <div className={styles.circleTop}></div>
                  <div className={styles.circleBottom}></div>
                </div>
              </motion.div>
            )) : (
              <div className={styles.emptyState}>Bạn chưa có voucher nào trong danh mục này.</div>
            )}
          </AnimatePresence>
        )}
      </div>

      <div className={styles.historyLink}>
        <button>Xem lịch sử voucher</button>
      </div>
    </div>
  );
}
