'use client';

import { useState, useEffect, Suspense } from 'react';
import { CreditCard, Plus, ShieldCheck, Landmark, Trash2, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './bank.module.css';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_default: boolean;
}

type BankInsertClient = {
  insert: (rows: Array<{
    user_id: string;
    bank_name: string;
    account_number: string;
    account_holder: string;
    is_default: boolean;
  }>) => Promise<{ error: { message: string } | null }>;
};

type BankUpdateClient = {
  update: (row: { is_default: boolean }) => {
    eq: (column: 'user_id' | 'id', value: string) => Promise<{ error: { message: string } | null }>;
  };
};

const VN_BANKS = [
  'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank',
  'MB Bank', 'ACB', 'VPBank', 'Sacombank', 'TPBank',
  'HDBank', 'SHB', 'SeABank', 'LienVietPostBank', 'MSB',
  'VIB', 'OCB', 'Eximbank', 'Bac A Bank', 'Nam A Bank',
];

function BankContent() {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  /* Form state */
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const supabase = createBrowserClient();

  const fetchBanks = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

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
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản ngân hàng này?')) return;
    
    const { error } = await supabase
      .from('user_banks')
      .delete()
      .eq('id', id);

    if (error) {
      setFeedback({ kind: 'error', message: 'Không thể xóa: ' + error.message });
    } else {
      setFeedback({ kind: 'success', message: 'Đã xóa tài khoản ngân hàng' });
      fetchBanks();
    }
    setTimeout(() => setFeedback(null), 3000);
  }

  async function handleAddBank() {
    if (!bankName || !accountNumber || !accountHolder) {
      setFeedback({ kind: 'error', message: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    /* If setting as default, unset other defaults */
    if (isDefault) {
      await (supabase.from('user_banks') as unknown as BankUpdateClient)
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const { error } = await (supabase.from('user_banks') as unknown as BankInsertClient)
      .insert([{
        user_id: user.id,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder.toUpperCase(),
        is_default: isDefault,
      }]);

    setSaving(false);

    if (error) {
      setFeedback({ kind: 'error', message: 'Lỗi: ' + error.message });
    } else {
      setFeedback({ kind: 'success', message: 'Đã thêm tài khoản ngân hàng!' });
      setShowModal(false);
      resetForm();
      fetchBanks();
    }
    setTimeout(() => setFeedback(null), 3000);
  }

  function resetForm() {
    setBankName('');
    setAccountNumber('');
    setAccountHolder('');
    setIsDefault(false);
  }

  return (
    <div className={styles.bankWrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Thẻ Tín Dụng/Ghi Nợ</h1>
        <button className={styles.addBtn}>
          <Plus size={18} /> Thêm Thẻ Mới
        </button>
      </header>

      <div className={styles.emptyState}>
        <CreditCard size={48} className={styles.emptyIcon} />
        <p>Tính năng liên kết thẻ đang được bảo trì.</p>
      </div>

      <header className={`${styles.header} ${styles.mt3}`}>
        <h1 className={styles.title}>Tài Khoản Ngân Hàng</h1>
        <button className={styles.addBtn} onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> Thêm Tài Khoản Ngân Hàng
        </button>
      </header>

      {loading ? (
        <div className={styles.loading}>Đang tải dữ liệu...</div>
      ) : banks.length > 0 ? (
        <div className={styles.bankGrid}>
          {banks.map(bank => (
            <motion.div
              key={bank.id}
              className={styles.bankCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              layout
            >
              <div className={styles.bankInfo}>
                <div className={styles.bankHeader}>
                  <Landmark size={20} className={styles.bankIcon} />
                  <span className={styles.bankName}>{bank.bank_name}</span>
                  {bank.is_default && <span className={styles.defaultBadge}>Mặc định</span>}
                </div>
                <div className={styles.bankDetails}>
                  <p className={styles.accountHolder}>{bank.account_holder}</p>
                  <p className={styles.accountNumber}>
                    **** **** **** {bank.account_number.slice(-4)}
                  </p>
                </div>
              </div>
              <div className={styles.bankActions}>
                <button 
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(bank.id)}
                  title="Xóa"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <ShieldCheck size={48} className={styles.emptyIcon} />
          <p>Bạn chưa có tài khoản ngân hàng nào.</p>
        </div>
      )}

      {/* Add Bank Modal */}
      <AnimatePresence>
        {showModal && (
          <div className={styles.modalOverlay}>
            <motion.div
              className={styles.modal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className={styles.modalHeader}>
                <h2>Thêm tài khoản ngân hàng</h2>
                <button className={styles.closeBtn} onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>

              <div className={styles.modalForm}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Ngân hàng</label>
                  <select
                    className={styles.input}
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                  >
                    <option value="">Chọn ngân hàng</option>
                    {VN_BANKS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Số tài khoản</label>
                  <input
                    className={styles.input}
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Nhập số tài khoản"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Tên chủ tài khoản</label>
                  <input
                    className={styles.input}
                    value={accountHolder}
                    onChange={e => setAccountHolder(e.target.value.toUpperCase())}
                    placeholder="NGUYEN VAN A"
                  />
                </div>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={e => setIsDefault(e.target.checked)}
                  />
                  <span>Đặt làm tài khoản mặc định</span>
                </label>

                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Hủy bỏ</button>
                  <button className={styles.submitBtn} disabled={saving} onClick={handleAddBank}>
                    {saving ? <Loader2 className={styles.spin} size={18} /> : 'Hoàn thành'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`${styles.toast} ${feedback.kind === 'success' ? styles.toastSuccess : styles.toastError}`}
          >
            {feedback.kind === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BankPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Đang đồng bộ...</div>}>
      <BankContent />
    </Suspense>
  );
}
