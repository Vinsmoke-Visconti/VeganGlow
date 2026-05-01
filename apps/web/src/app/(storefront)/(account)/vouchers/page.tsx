'use client';

import { useState, useEffect } from 'react';
import { 
  Ticket, Clock, Tag, Gift, 
  Info, Loader2,
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
  const [activeTab, setActiveTab] = useState<'available' | 'my'>('available');
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [myVouchers, setMyVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [voucherCode, setVoucherCode] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch all active vouchers
    const { data: allVouchers } = await supabase
      .from('vouchers')
      .select('*')
      .eq('is_active', true);

    // Fetch user's claimed vouchers
    const { data: userVouchers } = await supabase
      .from('user_vouchers')
      .select('voucher_id, is_used')
      .eq('user_id', user.id);

    if (allVouchers) {
      const claimedIds = userVouchers?.map(uv => uv.voucher_id) || [];
      
      // Available are those NOT yet claimed by user
      setAvailableVouchers(allVouchers.filter(v => !claimedIds.includes(v.id)));
      
      // My vouchers are those claimed
      const myFlat = userVouchers?.map(uv => {
        const v = allVouchers.find(av => av.id === uv.voucher_id);
        return v ? { ...v, is_used: uv.is_used } : null;
      }).filter(Boolean) as Voucher[];
      
      setMyVouchers(myFlat);
    }
    setLoading(false);
  }

  const handleClaim = async (voucherId: string) => {
    setClaimingId(voucherId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_vouchers')
        .insert({ user_id: user.id, voucher_id: voucherId });

      if (error) throw error;
      
      // Refresh
      await fetchAllData();
      setActiveTab('my');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setClaimingId(null);
    }
  };

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
          <button 
            className={`${styles.tab} ${activeTab === 'available' ? styles.tabActive : ''}`} 
            onClick={() => setActiveTab('available')}
          >
            Sưu tầm Voucher
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'my' ? styles.tabActive : ''}`} 
            onClick={() => setActiveTab('my')}
          >
            Voucher của tôi ({myVouchers.length})
          </button>
        </div>
      </header>

      <div className={styles.voucherGrid}>
        <AnimatePresence mode="popLayout">
          {(activeTab === 'available' ? availableVouchers : myVouchers).length > 0 ? (activeTab === 'available' ? availableVouchers : myVouchers).map((v, idx) => (
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
                    {activeTab === 'available' && <span className={styles.tagLimited}>Số lượng có hạn</span>}
                  </div>
                  <p className={styles.voucherDesc}>{v.description || 'Không có mô tả'}</p>
                  
                  <div className={styles.voucherFooter}>
                    <div className={styles.expiryBox}>
                      <Clock size={12} />
                      <span>HSD: {v.end_date ? new Date(v.end_date).toLocaleDateString('vi-VN') : 'Không thời hạn'}</span>
                    </div>
                    {activeTab === 'available' ? (
                      <button 
                        className={styles.useBtn} 
                        onClick={() => handleClaim(v.id)}
                        disabled={claimingId === v.id}
                      >
                        {claimingId === v.id ? <Loader2 size={14} className={styles.spin} /> : 'Sưu tầm'}
                      </button>
                    ) : (
                      <button className={styles.useBtn} disabled={v.is_used}>
                        {v.is_used ? 'Đã sử dụng' : 'Dùng ngay'}
                      </button>
                    )}
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
              <p>{activeTab === 'available' ? 'Hiện không có voucher mới nào.' : 'Bạn chưa sở hữu voucher nào.'}</p>
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
