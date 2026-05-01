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
  Home,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { VnAddressSelect, emptyVnAddress, type VnAddressValue } from '@/components/shared/VnAddressSelect';
import styles from './address.module.css';

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

  return (
    <div className={styles.addressWrapper}>
      <Link href="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Quay lại hồ sơ
      </Link>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Sổ địa chỉ</h1>
          <p className={styles.subtitle}>Quản lý địa chỉ nhận hàng để mua sắm thuận tiện và giao hàng chính xác hơn.</p>
        </div>
        <button className={styles.addBtn} onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={16} /> Thêm địa chỉ mới
        </button>
      </header>

      {loading ? (
        <div className={styles.loaderContainer}>
          <Loader2 className={styles.spin} size={28} />
        </div>
      ) : addresses.length > 0 ? (
        <div className={styles.grid}>
          {addresses.map((addr) => (
            <div key={addr.id} className={`${styles.addressCard} ${addr.is_default ? styles.defaultCard : ''}`}>
              <div className={styles.cardHeader}>
                <div className={styles.userBasic}>
                  <MapPin size={16} color="var(--color-primary)" />
                  <span className={styles.userName}>{addr.full_name}</span>
                  {addr.is_default && <span className={styles.defaultTag}>Mặc định</span>}
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.iconBtn} onClick={() => handleEdit(addr)}>
                    <Edit3 size={14} />
                  </button>
                  {!addr.is_default && (
                    <button className={styles.iconBtnDelete} onClick={() => handleDelete(addr.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.infoLine}>
                  <Phone size={14} />
                  <span>{addr.phone}</span>
                </div>
                <div className={styles.infoLine}>
                  <Home size={14} />
                  <span>{addr.address}</span>
                </div>
                <div className={styles.locationTag}>
                  {addr.ward}{addr.province ? `, ${addr.province}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} style={{ display: 'flex', justifyContent: 'center' }}>
            <MapPin size={48} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>Chưa có địa chỉ</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Hãy thêm một địa chỉ để chúng tôi giao hàng đến tận cửa nhanh và chính xác nhất.</p>
          <button className={styles.addBtn} style={{ margin: '0 auto' }} onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={16} /> Thêm địa chỉ mới
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Họ và tên</label>
                  <input
                    className={styles.input}
                    placeholder="Nhập tên người nhận"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Số điện thoại</label>
                  <input
                    className={styles.input}
                    placeholder="0xxx..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Khu vực</label>
                <VnAddressSelect value={vnAddress} onChange={setVnAddress} />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Địa chỉ cụ thể</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Số nhà, tên đường..."
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                />
              </div>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <span className={styles.checkboxCustom}></span>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Đặt làm địa chỉ mặc định</span>
              </label>

              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  Hủy bỏ
                </button>
                <button className={styles.submitBtn} onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={16} className={styles.spin} style={{ display: 'inline-block' }} /> : 'Hoàn thành'}
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

