'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, ShieldCheck, Landmark, 
  Trash2, Loader2, Landmark as BankIcon,
  ChevronRight, AlertCircle, Info, MoreVertical,
  Zap, ArrowUpRight, ArrowDownLeft, Wallet,
  Fingerprint, Globe, History, Shield
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

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'in' | 'out';
  created_at: string;
}

interface WalletSettings {
  biometric_auth: boolean;
  quick_pay: boolean;
}

export default function BankPage() {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<WalletSettings>({ biometric_auth: false, quick_pay: false });
  const [loading, setLoading] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // FETCH REAL DATA ONLY
    const [banksRes, transRes, settingsRes] = await Promise.all([
      supabase.from('user_banks').select('*').eq('user_id', user.id).order('is_default', { ascending: false }),
      supabase.from('user_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('user_settings').select('biometric_auth, quick_pay').eq('user_id', user.id).maybeSingle()
    ]);

    setBanks(banksRes.data || []);
    setTransactions(transRes.data || []);
    if (settingsRes.data) setSettings(settingsRes.data);
    
    setLoading(false);
  }

  const toggleSetting = async (key: keyof WalletSettings) => {
    setUpdatingSettings(true);
    const newVal = !settings[key];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_settings')
      .update({ [key]: newVal })
      .eq('user_id', user.id);

    if (!error) {
      setSettings({ ...settings, [key]: newVal });
    }
    setUpdatingSettings(false);
  };

  if (loading) return (
    <div className={styles.loaderContainer}>
      <Loader2 size={40} className={styles.spin} />
      <p>Đang đồng bộ dữ liệu thật...</p>
    </div>
  );

  return (
    <motion.div className={styles.bankWrapper} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}><Wallet size={24} /></div>
          <div>
            <h1 className={styles.title}>Ví & Thanh toán</h1>
            <p className={styles.subtitle}>Kết nối trực tiếp với hệ thống ngân hàng bảo mật</p>
          </div>
        </div>
        <div className={styles.actionGroup}>
          <button className={styles.addBtnPrimary}><BankIcon size={18} /> Liên kết ngân hàng</button>
        </div>
      </header>

      <div className={styles.dashboardGrid}>
        <div className={styles.mainContent}>
          <div className={styles.sectionHeader}>
            <h3>Tài khoản đã liên kết</h3>
            <span className={styles.countBadge}>{banks.length}</span>
          </div>

          <div className={styles.cardGrid}>
            <AnimatePresence>
              {banks.length > 0 ? (
                banks.map((bank) => (
                  <motion.div 
                    key={bank.id}
                    className={`${styles.luxuryCard} ${bank.is_default ? styles.cardGold : styles.cardSilver}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -5 }}
                  >
                    <div className={styles.cardTop}>
                      <div className={styles.chip}></div>
                      <div className={styles.bankLogo}><span>{bank.bank_name}</span></div>
                    </div>
                    <div className={styles.cardNumber}>
                      <span>****</span> <span>****</span> <span>****</span> <span>{bank.account_number.slice(-4)}</span>
                    </div>
                    <div className={styles.cardBottom}>
                      <div className={styles.holderInfo}>
                        <label>CHỦ TÀI KHOẢN</label>
                        <p>{bank.account_holder.toUpperCase()}</p>
                      </div>
                      {bank.is_default && <div className={styles.defaultLabel}>PRIMARY</div>}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className={styles.emptyCardState}>
                  <div className={styles.emptyIcon}><CreditCard size={48} /></div>
                  <h4>Chưa có tài khoản liên kết</h4>
                  <p>Hãy liên kết ngân hàng để trải nghiệm thanh toán 1-Click bảo mật.</p>
                  <button className={styles.addBtnPrimary} style={{marginTop: 20}}><Plus size={18} /> Thêm tài khoản ngay</button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sideCard}>
            <div className={styles.sideHeader}><Shield size={18} /><h4>Bảo mật ví</h4></div>
            <div className={styles.settingList}>
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}><Fingerprint size={16} /><span>Xác thực vân tay/khuôn mặt</span></div>
                <button className={`${styles.toggle} ${settings.biometric_auth ? styles.active : ''}`} onClick={() => toggleSetting('biometric_auth')} disabled={updatingSettings}><div className={styles.knob}></div></button>
              </div>
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}><Zap size={16} /><span>Thanh toán 1-Click</span></div>
                <button className={`${styles.toggle} ${settings.quick_pay ? styles.active : ''}`} onClick={() => toggleSetting('quick_pay')} disabled={updatingSettings}><div className={styles.knob}></div></button>
              </div>
            </div>
          </div>

          <div className={styles.sideCard}>
            <div className={styles.sideHeader}><History size={18} /><h4>Giao dịch gần đây</h4></div>
            <div className={styles.historyList}>
              {transactions.length > 0 ? (
                transactions.map((t) => (
                  <div key={t.id} className={styles.transItem}>
                    <div className={`${styles.transIcon} ${t.type === 'in' ? styles.in : styles.out}`}>
                      {t.type === 'in' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div className={styles.transMeta}>
                      <p className={styles.transTitle}>{t.title}</p>
                      <span className={styles.transDate}>{new Date(t.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <span className={`${styles.transAmount} ${t.type === 'in' ? styles.textGreen : ''}`}>
                      {t.type === 'in' ? '+' : '-'}{t.amount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyTrans}><p>Chưa có giao dịch nào.</p></div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
