'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, ShieldCheck, Landmark, 
  Trash2, Loader2, Landmark as BankIcon,
  ChevronRight, AlertCircle, Info, MoreVertical
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './bank.module.css';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_default: boolean;
  type: 'bank' | 'card';
}

export default function BankPage() {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchBanks();
  }, []);

  async function fetchBanks() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_banks')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('Error fetching banks:', error);
    } else {
      setBanks(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản ngân hàng này?')) return;
    const { error } = await supabase.from('user_banks').delete().eq('id', id);
    if (error) alert('Không thể xóa: ' + error.message);
    else fetchBanks();
  }

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className={styles.spin} size={40} />
      </div>
    );
  }

  return (
    <motion.div 
      className={styles.bankWrapper}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Ngân hàng & Thẻ</h1>
          <p className={styles.subtitle}>Quản lý phương thức thanh toán an toàn của bạn</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addBtn}>
            <Plus size={18} /> Thêm thẻ mới
          </button>
          <button className={styles.addBtnPrimary}>
            <BankIcon size={18} /> Thêm ngân hàng
          </button>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <CreditCard size={20} />
          <h3>Thẻ Tín Dụng/Ghi Nợ</h3>
        </div>
        <div className={styles.cardInfoBox}>
          <Info size={16} />
          <p>Tính năng liên kết thẻ trực tiếp đang được nâng cấp bảo mật theo tiêu chuẩn PCI DSS.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Landmark size={20} />
          <h3>Tài Khoản Ngân Hàng</h3>
        </div>

        {banks.length > 0 ? (
          <div className={styles.bankGrid}>
            {banks.map((bank, idx) => (
              <motion.div 
                key={bank.id} 
                className={`${styles.bankCard} ${bank.is_default ? styles.defaultCard : ''}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.bankMeta}>
                    <div className={styles.bankIconBg}>
                      <Landmark size={24} />
                    </div>
                    <div className={styles.bankNameInfo}>
                      <span className={styles.bankName}>{bank.bank_name}</span>
                      {bank.is_default && <span className={styles.defaultTag}>Mặc định</span>}
                    </div>
                  </div>
                  <button className={styles.moreBtn}><MoreVertical size={18} /></button>
                </div>

                <div className={styles.cardBody}>
                  <p className={styles.accountNumber}>
                    <span>****</span>
                    <span>****</span>
                    <span>****</span>
                    <span className={styles.lastDigits}>{bank.account_number.slice(-4)}</span>
                  </p>
                  <p className={styles.accountHolder}>{bank.account_holder.toUpperCase()}</p>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.securityInfo}>
                    <ShieldCheck size={14} />
                    <span>Đã bảo mật</span>
                  </div>
                  <button onClick={() => handleDelete(bank.id)} className={styles.deleteLink}>
                    Xóa liên kết
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><ShieldCheck size={48} /></div>
            <p>Bạn chưa liên kết tài khoản ngân hàng nào.</p>
            <button className={styles.addBtnInline}>Thêm ngay</button>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <div className={styles.securityBadge}>
          <ShieldCheck size={20} />
          <span>Mọi thông tin thanh toán đều được mã hóa đầu cuối</span>
        </div>
      </footer>
    </motion.div>
  );
}
