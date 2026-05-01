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
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';

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

const BANK_GRADIENTS = [
  'from-[#0F2027] via-[#203A43] to-[#2C5364]',
  'from-[#11998e] to-[#38ef7d]',
  'from-[#1F4037] to-[#99F2C8]',
  'from-[#43cea2] to-[#185a9d]',
  'from-[#0F4C75] via-[#3282B8] to-[#BBE1FA]',
  'from-[#283c86] to-[#45a247]',
];

function gradientFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return BANK_GRADIENTS[Math.abs(hash) % BANK_GRADIENTS.length];
}

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
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-6"
      >
        <ArrowLeft size={14} /> Quay lại hồ sơ
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-primary">Phương thức thanh toán</span>
          <h1 className="font-serif text-3xl lg:text-4xl font-medium tracking-tight text-text mt-1">
            Tài khoản ngân hàng
          </h1>
          <p className="mt-2 text-text-secondary text-sm">
            Liên kết tài khoản để hoàn tiền và nhận voucher.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition"
        >
          <Plus size={16} /> Thêm tài khoản
        </button>
      </header>

      {loading ? (
        <div className="text-center py-16 text-text-muted">
          <Loader2 size={24} className="inline animate-spin mr-2" /> Đang tải dữ liệu...
        </div>
      ) : banks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {banks.map((bank) => (
            <article
              key={bank.id}
              className={`relative aspect-[1.6/1] rounded-2xl p-6 text-white overflow-hidden bg-gradient-to-br ${gradientFor(bank.bank_name)} shadow-lg`}
            >
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 -left-10 w-44 h-44 rounded-full bg-white/5" />

              <div className="relative flex flex-col h-full justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/70 mb-1">
                      Ngân hàng
                    </div>
                    <div className="font-serif text-xl font-medium leading-tight">{bank.bank_name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bank.is_default && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-[10px] font-medium tracking-wide">
                        Mặc định
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(bank.id)}
                      className="grid place-items-center w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 transition"
                      title="Xóa"
                      aria-label="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="font-mono text-lg lg:text-xl tracking-[0.18em]">
                    •••• •••• •••• {bank.account_number.slice(-4)}
                  </div>
                  <div className="flex items-end justify-between mt-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/70 mb-0.5">
                        Chủ tài khoản
                      </div>
                      <div className="text-sm font-medium tracking-wide">{bank.account_holder}</div>
                    </div>
                    <CreditCard size={28} className="text-white/70" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 lg:py-24 rounded-2xl bg-bg-card border border-border-light">
          <div className="inline-grid place-items-center w-20 h-20 rounded-full bg-primary-50 text-primary mb-4">
            <ShieldCheck size={32} />
          </div>
          <h3 className="font-serif text-xl font-medium text-text mb-2">
            Bạn chưa có tài khoản ngân hàng
          </h3>
          <p className="text-text-secondary text-sm">Thêm tài khoản để nhận hoàn tiền nhanh chóng.</p>
        </div>
      )}

      {/* Add Bank Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 grid place-items-center px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-bg-card p-6 lg:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-medium text-text">Thêm tài khoản ngân hàng</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="grid place-items-center w-9 h-9 rounded-full hover:bg-primary-50"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                  Ngân hàng
                </span>
                <select
                  className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm text-text focus:border-text focus:outline-none"
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
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                  Số tài khoản
                </span>
                <input
                  className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm text-text focus:border-text focus:outline-none tabular-nums"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập số tài khoản"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                  Tên chủ tài khoản
                </span>
                <input
                  className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm text-text focus:border-text focus:outline-none"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-text-secondary mt-1">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-text"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                Đặt làm tài khoản mặc định
              </label>

              <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-11 rounded-full border border-border text-text-secondary text-sm font-medium hover:border-text hover:text-text transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleAddBank}
                  className="flex-1 h-11 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Hoàn thành'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {feedback && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-sm font-medium z-50 ${
            feedback.kind === 'success' ? 'bg-success text-white' : 'bg-error text-white'
          }`}
        >
          {feedback.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {feedback.message}
        </div>
      )}
    </div>
  );
}

export default function BankPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-text-muted">Đang đồng bộ...</div>}>
      <BankContent />
    </Suspense>
  );
}
