'use client';

import { useState, useEffect } from 'react';
import { 
  Ticket, Clock, Tag, Search, 
  Filter, ChevronRight, Gift, 
  Info, CheckCircle2, Loader2,
  Sparkles, Zap
} from 'lucide-react';
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
  const [voucherCode, setVoucherCode] = useState('');
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchVouchers();
  }, []);

  async function fetchVouchers() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
    if (filter === 'used') return v.is_used;
    return !v.is_used;
  });

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className={styles.spin} size={40} />
      </div>
    );
  }

  return (
    <motion.div 
      className={styles.wrapper}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Kho Voucher</h1>
            <p className={styles.subtitle}>Sưu tầm ưu đãi để tận hưởng mua sắm tiết kiệm</p>
          </div>
          <div className={styles.addVoucherBox}>
            <div className={styles.inputWrapper}>
              <Tag size={16} className={styles.inputIcon} />
              <input 
                type="text" 
                placeholder="Nhập mã voucher tại đây" 
                className={styles.voucherInput}
                value={voucherCode}
                onChange={e => setVoucherCode(e.target.value)}
              />
            </div>
            <button className={styles.applyBtn}>Sưu tầm</button>
          </div>
        </div>

        <section className={styles.welcomeOffer}>
          <div className={styles.offerIcon}>
            <Sparkles size={24} />
          </div>
          <div className={styles.offerInfo}>
            <h4>Ưu đãi cho thành viên mới</h4>
            <p>Nhận ngay Voucher giảm 50.000đ cho đơn hàng đầu tiên sau khi xác thực danh tính.</p>
          </div>
          <button className={styles.claimBtn}>Nhận ngay</button>
        </section>
        
        <div className={styles.tabs}>
          {['all', 'shipping', 'discount', 'used'].map(t => (
            <button 
              key={t}
              className={`${styles.tab} ${filter === t ? styles.tabActive : ''}`} 
              onClick={() => setFilter(t)}
            >
              {t === 'all' ? 'Tất cả' : t === 'shipping' ? 'Vận chuyển' : t === 'discount' ? 'Giảm giá' : 'Đã dùng'}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.voucherGrid}>
        <AnimatePresence mode="popLayout">
          {filteredVouchers.length > 0 ? filteredVouchers.map((v, idx) => (
            <motion.div 
              key={v.id} 
              className={`${styles.voucherCard} ${v.is_used ? styles.cardUsed : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              layout
            >
              <div className={`${styles.cardLeft} ${v.discount_type === 'shipping' ? styles.typeShipping : styles.typeDiscount}`}>
                <div className={styles.typeIconBg}>
                  {v.discount_type === 'shipping' ? <Zap size={24} /> : <Gift size={24} />}
                </div>
                <span className={styles.typeLabel}>{v.discount_type === 'shipping' ? 'FREESHIP' : 'DISCOUNT'}</span>
              </div>
              
              <div className={styles.cardRight}>
                <div className={styles.cardInfo}>
                  <div className={styles.cardInfoTop}>
                    <h3 className={styles.voucherTitle}>{v.title}</h3>
                    {!v.is_used && <span className={styles.tagLimited}>Số lượng có hạn</span>}
                  </div>
                  <p className={styles.voucherDesc}>{v.description}</p>
                  
                  <div className={styles.voucherFooter}>
                    <div className={styles.expiryBox}>
                      <Clock size={12} />
                      <span>HSD: {new Date(v.end_date).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <button className={styles.useBtn} disabled={v.is_used}>
                      {v.is_used ? 'Đã sử dụng' : 'Dùng ngay'}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.decorCircles}>
                <div className={styles.circleTop}></div>
                <div className={styles.circleBottom}></div>
              </div>
            </motion.div>
          )) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Ticket size={48} /></div>
              <p>Bạn chưa có voucher nào trong danh mục này.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.footerInfo}>
        <Info size={16} />
        <span>Voucher chỉ có giá trị khi áp dụng tại trang thanh toán.</span>
      </div>
    </motion.div>
  );
}
