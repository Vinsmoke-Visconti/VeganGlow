'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { MapPin, Plus, Loader2, Home, Briefcase, Trash2 } from 'lucide-react';
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

export default function AddressPage() {
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vnAddress, setVnAddress] = useState<VnAddressValue>(emptyVnAddress);
  const [streetAddress, setStreetAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  async function fetchAddresses() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching addresses:', error);
    } else {
      setAddresses(data || []);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!fullName || !phone || !streetAddress || !vnAddress.province) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // If setting as default, unset other defaults
    if (isDefault) {
      await (supabase.from('addresses') as any)
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const payload = {
      user_id: user.id,
      full_name: fullName,
      phone,
      address: streetAddress,
      city: vnAddress.province,
      province: vnAddress.province,
      ward: vnAddress.ward,
      district: null as string | null,
      is_default: isDefault,
    };

    let error;
    if (editingId) {
      const { error: err } = await (supabase.from('addresses') as any)
        .update(payload)
        .eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await (supabase.from('addresses') as any).insert([payload]);
      error = err;
    }

    if (error) {
      alert('Lỗi: ' + error.message);
    } else {
      setShowModal(false);
      resetForm();
      fetchAddresses();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa địa chỉ này?')) return;
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchAddresses();
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
    return <div className={styles.loader}><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className={styles.addressWrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Địa chỉ của tôi</h1>
        <button className={styles.addBtn} onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> Thêm địa chỉ mới
        </button>
      </header>

      <div className={styles.addressList}>
        <h3 className={styles.listTitle}>Địa chỉ</h3>
        
        {addresses.length > 0 ? addresses.map(addr => (
          <div key={addr.id} className={styles.addressCard}>
            <div className={styles.cardInfo}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{addr.full_name}</span>
                <span className={styles.divider}>|</span>
                <span className={styles.userPhone}>{addr.phone}</span>
              </div>
              <div className={styles.addressDetail}>
                <p>{addr.address}</p>
                <p>{addr.ward}, {addr.district}, {addr.province}</p>
              </div>
              {addr.is_default && <span className={styles.defaultTag}>Mặc định</span>}
            </div>
            <div className={styles.cardActions}>
              <button className={styles.actionBtn} onClick={() => handleEdit(addr)}>Cập nhật</button>
              {!addr.is_default && <button className={styles.actionBtn} onClick={() => handleDelete(addr.id)}>Xóa</button>}
              {!addr.is_default && <button className={styles.setBtn}>Thiết lập mặc định</button>}
            </div>
          </div>
        )) : (
          <div className={styles.emptyState}>Bạn chưa có địa chỉ nào.</div>
        )}
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>{editingId ? 'Cập nhật địa chỉ' : 'Địa chỉ mới'}</h2>
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <input className={styles.input} placeholder="Họ và tên" value={fullName} onChange={e => setFullName(e.target.value)} />
                <input className={styles.input} placeholder="Số điện thoại" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <VnAddressSelect value={vnAddress} onChange={setVnAddress} />
              <textarea className={styles.textarea} placeholder="Địa chỉ cụ thể" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} />
              
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                <span>Đặt làm địa chỉ mặc định</span>
              </label>

              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Trở Lại</button>
                <button className={styles.submitBtn} disabled={saving} onClick={handleSave}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Hoàn thành'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
