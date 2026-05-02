'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  CreditCard,
  Plus,
  ShieldCheck,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Wallet,
  Star,
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import styles from './bank.module.css';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_default: boolean;
}

type BankInsertClient = {
  insert: (
    rows: Array<{
      user_id: string;
      bank_name: string;
      account_number: string;
      account_holder: string;
      is_default: boolean;
    }>,
  ) => Promise<{ error: { message: string } | null }>;
};

type BankUpdateClient = {
  update: (row: { is_default: boolean }) => {
    eq: (column: 'user_id' | 'id', value: string) => Promise<{ error: { message: string } | null }>;
  };
};

const VN_BANKS = [
  'Vietcombank',
  'VietinBank',
  'BIDV',
  'Agribank',
  'Techcombank',
  'MB Bank',
  'ACB',
  'VPBank',
  'Sacombank',
  'TPBank',
  'HDBank',
  'SHB',
  'SeABank',
  'LienVietPostBank',
  'MSB',
  'VIB',
  'OCB',
  'Eximbank',
  'Bac A Bank',
  'Nam A Bank',
];

function BankContent() {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const supabase = createBrowserClient();

  const fetchBanks = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_banks')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false });

    if (error) console.error('Error fetching banks:', error);
    else setBanks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản ngân hàng này?')) return;
    const { error } = await supabase.from('user_banks').delete().eq('id', id);
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
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    if (isDefault) {
      await (supabase.from('user_banks') as unknown as BankUpdateClient)
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const { error } = await (supabase.from('user_banks') as unknown as BankInsertClient).insert([
      {
        user_id: user.id,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder.toUpperCase(),
        is_default: isDefault,
      },
    ]);

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
      <Link href="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Quay lại hồ sơ
      </Link>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tài khoản ngân hàng</h1>
          <p className={styles.subtitle}>Liên kết tài khoản để hoàn tiền và nhận voucher một cách nhanh chóng, an toàn.</p>
        </div>
        <button className={styles.addBtnPrimary} onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={16} /> Thêm tài khoản
        </button>
      </header>

      {loading ? (
        <div className={styles.loaderContainer}>
          <Loader2 className={styles.spin} size={28} />
        </div>
      ) : banks.length > 0 ? (
        <div className={styles.cardGrid}>
          {banks.map((bank, i) => (
            <div key={bank.id} className={`${styles.luxuryCard} ${i % 2 === 0 ? styles.cardGold : styles.cardSilver}`}>
              <div className={styles.cardActions}>
                <button
                  className={styles.deleteCardBtn}
                  onClick={() => handleDelete(bank.id)}
                  title="Xóa"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className={styles.cardTop}>
                <div className={styles.chip}></div>
                <div className={styles.bankLogo}>{bank.bank_name}</div>
              </div>
              <div className={styles.cardNumber}>
                <span>••••</span>
                <span>••••</span>
                <span>••••</span>
                <span>{bank.account_number.slice(-4)}</span>
              </div>
              <div className={styles.cardBottom}>
                <div className={styles.holderInfo}>
                  <label>CHỦ TÀI KHOẢN</label>
                  <p>{bank.account_holder}</p>
                </div>
                {bank.is_default && <span className={styles.defaultLabel}>Mặc định</span>}
              </div>
            </div>
          ))}
          <div className={styles.addNewBox} onClick={() => { resetForm(); setShowModal(true); }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'white', color: 'var(--color-primary-dark)' }}>
              <Plus size={20} />
            </div>
            <span>Thêm tài khoản mới</span>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} style={{ display: 'flex', justifyContent: 'center' }}>
            <ShieldCheck size={48} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>Bạn chưa có tài khoản ngân hàng</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Thêm tài khoản để nhận hoàn tiền nhanh chóng và nhận thưởng theo từng đơn.</p>
          <button className={styles.addBtnPrimary} style={{ margin: '0 auto' }} onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={16} /> Thêm tài khoản đầu tiên
          </button>
        </div>
      )}

      {/* Add Bank Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Thêm tài khoản ngân hàng</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Ngân hàng</label>
                <select
                  className={styles.input}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                >
                  <option value="">Chọn ngân hàng</option>
                  {VN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Số tài khoản</label>
                <input
                  className={styles.input}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập số tài khoản"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tên chủ tài khoản</label>
                <input
                  className={styles.input}
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                />
              </div>

              <label className={styles.checkboxLabel} style={{ marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                Đặt làm tài khoản mặc định
              </label>

              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  Hủy bỏ
                </button>
                <button className={styles.submitBtn} onClick={handleAddBank} disabled={saving}>
                  {saving ? <Loader2 size={16} className={styles.spin} /> : 'Hoàn thành'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {feedback && (
        <div className={`${styles.toast} ${feedback.kind === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {feedback.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {feedback.message}
        </div>
      )}
    </div>
  );
}

export default function BankPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
          <Loader2 size={24} className={styles.spin} style={{ display: 'inline', marginRight: '0.5rem' }} /> Đang đồng bộ...
        </div>
      }
    >
      <BankContent />
    </Suspense>
  );
}
