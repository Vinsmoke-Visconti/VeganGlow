'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  MapPin, Plus, Loader2, Home, Briefcase,
  Trash2, Edit3, CheckCircle2, ChevronRight,
  AlertCircle, X, Search, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  
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
      setFeedback({ kind: 'error', message: 'Vui lòng điền đầy đủ thông tin' });
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
      province: vnAddress.province,
      ward: vnAddress.ward,
      district: vnAddress.province === vnAddress.ward ? '' : null, // Simplified for now
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
      setFeedback({ kind: 'error', message: 'Lỗi: ' + error.message });
    } else {
      setFeedback({ kind: 'success', message: editingId ? 'Đã cập nhật địa chỉ!' : 'Đã thêm địa chỉ mới!' });
      setShowModal(false);
      resetForm();
      fetchAddresses();
      setTimeout(() => setFeedback(null), 3000);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) setFeedback({ kind: 'error', message: error.message });
    else {
      setFeedback({ kind: 'success', message: 'Đã xóa địa chỉ' });
      fetchAddresses();
      setTimeout(() => setFeedback(null), 3000);
    }
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
      <div className={styles.loaderContainer}>
        <Loader2 className={styles.spin} size={40} />
      </div>
    );
  }

  return (
    <motion.div 
      className={styles.addressWrapper}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Địa chỉ của tôi</h1>
          <p className={styles.subtitle}>Quản lý địa chỉ nhận hàng để mua sắm thuận tiện hơn</p>
        </div>
        <button className={styles.addBtn} onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> Thêm địa chỉ mới
        </button>
      </header>

      <div className={styles.addressList}>
        {addresses.length > 0 ? (
          <div className={styles.grid}>
            {addresses.map((addr, idx) => (
              <motion.div 
                key={addr.id} 
                className={`${styles.addressCard} ${addr.is_default ? styles.defaultCard : ''}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.userBasic}>
                    <span className={styles.userName}>{addr.full_name}</span>
                    {addr.is_default && <span className={styles.defaultTag}>Mặc định</span>}
                  </div>
                  <div className={styles.cardActions}>
                    <button onClick={() => handleEdit(addr)} className={styles.iconBtn} title="Sửa">
                      <Edit3 size={16} />
                    </button>
                    {!addr.is_default && (
                      <button onClick={() => handleDelete(addr.id)} className={styles.iconBtnDelete} title="Xóa">
                        <Trash2 size={16} />
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
                    <MapPin size={14} />
                    <p>{addr.address}</p>
                  </div>
                  <div className={styles.locationTag}>
                    {addr.ward}, {addr.province}
                  </div>
                </div>

                {!addr.is_default && (
                  <button className={styles.setAsDefaultBtn}>
                    Thiết lập mặc định
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><MapPin size={48} /></div>
            <p>Bạn chưa có địa chỉ nào. Hãy thêm một địa chỉ để bắt đầu mua sắm!</p>
          </div>
        )}
      </div>

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
                <h2>{editingId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</h2>
                <button className={styles.closeBtn} onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              
              <div className={styles.modalForm}>
                <div className={styles.formRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Họ và tên</label>
                    <input className={styles.input} placeholder="Nhập tên người nhận" value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Số điện thoại</label>
                    <input className={styles.input} placeholder="Nhập số điện thoại" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Khu vực</label>
                  <VnAddressSelect value={vnAddress} onChange={setVnAddress} />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Địa chỉ cụ thể</label>
                  <textarea className={styles.textarea} placeholder="Số nhà, tên đường..." value={streetAddress} onChange={e => setStreetAddress(e.target.value)} />
                </div>
                
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                  <div className={styles.checkboxCustom}></div>
                  <span>Đặt làm địa chỉ mặc định</span>
                </label>

                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Hủy bỏ</button>
                  <button className={styles.submitBtn} disabled={saving} onClick={handleSave}>
                    {saving ? <Loader2 className={styles.spin} size={18} /> : 'Hoàn thành'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
    </motion.div>
  );
}
