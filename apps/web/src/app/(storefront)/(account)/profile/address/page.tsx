'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  MapPin,
  Plus,
  Loader2,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { VnAddressSelect, emptyVnAddress, type VnAddressValue } from '@/components/shared/VnAddressSelect';

interface Address {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  province: string | null;
  district: string | null;
  ward: string | null;
  is_default: boolean;
}

type AddressPayload = {
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  province: string;
  ward: string;
  district: string | null;
  is_default: boolean;
};

type AddressWriteClient = {
  update: (row: Partial<AddressPayload>) => {
    eq: (column: 'user_id' | 'id', value: string) => Promise<{ error: { message: string } | null }>;
  };
  insert: (rows: AddressPayload[]) => Promise<{ error: { message: string } | null }>;
};

export default function AddressPage() {
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vnAddress, setVnAddress] = useState<VnAddressValue>(emptyVnAddress);
  const [streetAddress, setStreetAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAddresses() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching addresses:', error);
    else setAddresses(data || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!fullName || !phone || !streetAddress || !vnAddress.province) {
      setFeedback({ kind: 'error', message: 'Vui lòng điền đầy đủ thông tin' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (isDefault) {
      await (supabase.from('addresses') as unknown as AddressWriteClient)
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const payload = {
      user_id: user.id,
      full_name: fullName,
      phone,
      address: streetAddress,
      province: vnAddress.province,
      ward: vnAddress.ward,
      district: vnAddress.province === vnAddress.ward ? '' : null,
      is_default: isDefault,
    };

    let error;
    if (editingId) {
      const { error: err } = await (supabase.from('addresses') as unknown as AddressWriteClient)
        .update(payload)
        .eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await (supabase.from('addresses') as unknown as AddressWriteClient).insert([
        payload,
      ]);
      error = err;
    }

    if (error) {
      setFeedback({ kind: 'error', message: 'Lỗi: ' + error.message });
    } else {
      setFeedback({
        kind: 'success',
        message: editingId ? 'Đã cập nhật địa chỉ!' : 'Đã thêm địa chỉ mới!',
      });
      setShowModal(false);
      resetForm();
      fetchAddresses();
    }
    setSaving(false);
    setTimeout(() => setFeedback(null), 3000);
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa địa chỉ này?')) return;
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) setFeedback({ kind: 'error', message: error.message });
    else {
      setFeedback({ kind: 'success', message: 'Đã xóa địa chỉ' });
      fetchAddresses();
    }
    setTimeout(() => setFeedback(null), 3000);
  }

  function resetForm() {
    setFullName('');
    setPhone('');
    setVnAddress(emptyVnAddress);
    setStreetAddress('');
    setIsDefault(false);
    setEditingId(null);
  }

  function handleEdit(addr: Address) {
    setEditingId(addr.id);
    setFullName(addr.full_name);
    setPhone(addr.phone);
    setStreetAddress(addr.address);
    setVnAddress({
      province: addr.province || '',
      province_code: '',
      ward: addr.ward || '',
      ward_code: '',
    });
    setIsDefault(addr.is_default);
    setShowModal(true);
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
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
          <span className="text-xs uppercase tracking-[0.2em] text-primary">Sổ địa chỉ</span>
          <h1 className="font-serif text-3xl lg:text-4xl font-medium tracking-tight text-text mt-1">
            Địa chỉ của tôi
          </h1>
          <p className="mt-2 text-text-secondary text-sm">
            Quản lý địa chỉ nhận hàng để mua sắm thuận tiện hơn.
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
          <Plus size={16} /> Thêm địa chỉ mới
        </button>
      </header>

      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {addresses.map((addr) => (
            <article
              key={addr.id}
              className={`relative rounded-2xl bg-bg-card p-6 border transition ${
                addr.is_default ? 'border-text shadow-sm' : 'border-border-light'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif text-lg font-medium text-text">{addr.full_name}</span>
                  {addr.is_default && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-text text-white text-[10px] font-medium tracking-wide">
                      <CheckCircle2 size={10} /> Mặc định
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(addr)}
                    className="grid place-items-center w-9 h-9 rounded-full text-text-secondary hover:bg-primary-50 hover:text-text transition"
                    title="Sửa"
                    aria-label="Sửa địa chỉ"
                  >
                    <Edit3 size={14} />
                  </button>
                  {!addr.is_default && (
                    <button
                      type="button"
                      onClick={() => handleDelete(addr.id)}
                      className="grid place-items-center w-9 h-9 rounded-full text-text-secondary hover:bg-primary-50 hover:text-error transition"
                      title="Xóa"
                      aria-label="Xóa địa chỉ"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Phone size={14} className="text-text-muted shrink-0" />
                  <span>{addr.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-text-secondary">
                  <MapPin size={14} className="text-text-muted shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{addr.address}</p>
                </div>
                <div className="text-xs text-text-muted ml-6">
                  {addr.ward}
                  {addr.province ? `, ${addr.province}` : ''}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 lg:py-24 rounded-2xl bg-bg-card border border-border-light">
          <div className="inline-grid place-items-center w-20 h-20 rounded-full bg-primary-50 text-primary mb-4">
            <MapPin size={32} />
          </div>
          <h3 className="font-serif text-xl font-medium text-text mb-2">Chưa có địa chỉ</h3>
          <p className="text-text-secondary text-sm mb-6">
            Hãy thêm một địa chỉ để bắt đầu mua sắm!
          </p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition"
          >
            <Plus size={16} /> Thêm địa chỉ mới
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 grid place-items-center px-4 overflow-y-auto py-8"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-bg-card p-6 lg:p-8 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-medium text-text">
                {editingId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}
              </h2>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    Họ và tên
                  </span>
                  <input
                    className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm text-text focus:border-text focus:outline-none"
                    placeholder="Nhập tên người nhận"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    Số điện thoại
                  </span>
                  <input
                    className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm text-text focus:border-text focus:outline-none tabular-nums"
                    placeholder="0xxx..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                  Khu vực
                </span>
                <VnAddressSelect value={vnAddress} onChange={setVnAddress} />
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                  Địa chỉ cụ thể
                </span>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm text-text focus:border-text focus:outline-none resize-none"
                  rows={3}
                  placeholder="Số nhà, tên đường..."
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-text-secondary mt-1">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-text"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                Đặt làm địa chỉ mặc định
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
                  onClick={handleSave}
                  className="flex-1 h-11 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Hoàn thành'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
