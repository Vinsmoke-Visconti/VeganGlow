'use client';

import { useState, useEffect, Suspense } from 'react';
import { CreditCard, Plus, ShieldCheck, Landmark, Trash2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import styles from './bank.module.css';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_default: boolean;
}

function BankContent() {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
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
      alert('Không thể xóa: ' + error.message);
    } else {
      fetchBanks();
    }
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
        <button className={styles.addBtn}>
          <Plus size={18} /> Thêm Tài Khoản Ngân Hàng
        </button>
      </header>

      {loading ? (
        <div className={styles.loading}>Đang tải dữ liệu...</div>
      ) : banks.length > 0 ? (
        <div className={styles.bankGrid}>
          {banks.map(bank => (
            <div key={bank.id} className={styles.bankCard}>
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
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <ShieldCheck size={48} className={styles.emptyIcon} />
          <p>Bạn chưa có tài khoản ngân hàng nào.</p>
        </div>
      )}
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
