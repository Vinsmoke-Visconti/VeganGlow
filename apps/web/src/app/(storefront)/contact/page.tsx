'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import styles from './contact.module.css';
import { submitContactMessage } from '@/app/actions/contact';

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const result = await submitContactMessage({
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      subject: String(fd.get('subject') ?? ''),
      message: String(fd.get('message') ?? ''),
    });

    setSubmitting(false);

    if (result.success) {
      setSent(true);
      form.reset();
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.header}
      >
        <div className={styles.eyebrow}>
          <MessageCircle size={14} /> Liên hệ
        </div>
        <h1 className={styles.title}>
          Hãy nói chuyện với chúng tôi
        </h1>
        <p className={styles.subtitle}>
          Có câu hỏi về sản phẩm, đơn hàng hay hợp tác? Đội ngũ VeganGlow luôn sẵn sàng hỗ trợ bạn.
        </p>
      </motion.div>

      <div className={styles.grid}>
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={styles.sidebar}
        >
          <ContactCard icon={<Mail size={22} />} label="Email" value="hello@veganglow.vn" />
          <ContactCard icon={<Phone size={22} />} label="Hotline" value="1900 1234" />
          <ContactCard icon={<MapPin size={22} />} label="Showroom" value="123 Nguyễn Văn Cừ, Q.5, TP.HCM" />
          <ContactCard icon={<Clock size={22} />} label="Giờ làm việc" value="T2 – CN: 8:00 – 21:00" />
        </motion.aside>

        <motion.form
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          onSubmit={handleSubmit}
          className={styles.form}
        >
          <h2 className={styles.formTitle}>Gửi tin nhắn</h2>

          {sent && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.sentNotice}
            >
              <CheckCircle2 size={18} /> Cảm ơn bạn! Tin nhắn đã được gửi đi.
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.sentNotice}
              style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }}
            >
              <AlertCircle size={18} /> {errorMessage}
            </motion.div>
          )}

          <div className={styles.formRow}>
            <Field label="Họ tên" name="name" required />
            <Field label="Email" name="email" type="email" required />
          </div>
          <Field label="Tiêu đề" name="subject" required />
          <Field label="Nội dung" name="message" textarea required />

          <button
            type="submit"
            disabled={submitting}
            className={styles.submitBtn}
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {submitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
          </button>
        </motion.form>
      </div>
    </div>
  );
}

function ContactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={styles.card}
    >
      <div className={styles.iconBox}>
        {icon}
      </div>
      <div>
        <div className={styles.cardLabel}>{label}</div>
        <div className={styles.cardValue}>{value}</div>
      </div>
    </motion.div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
};
function Field({ label, name, type = 'text', required, textarea }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}{required && <span className={styles.required}> *</span>}
      </label>
      {textarea ? (
        <textarea name={name} required={required} className={styles.textarea} />
      ) : (
        <input name={name} type={type} required={required} className={styles.input} />
      )}
    </div>
  );
}
