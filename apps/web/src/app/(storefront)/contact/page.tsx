'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, Loader2, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    // Demo only — replace with real endpoint
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSent(true);
    (e.currentTarget as HTMLFormElement).reset();
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: '3rem' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#d1fae5', color: '#065f46', padding: '6px 14px', borderRadius: 9999, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
          <MessageCircle size={14} /> Liên hệ
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.25rem, 4vw, 3rem)', fontWeight: 800, color: '#1a4d2e', marginBottom: '1rem' }}>
          Hãy nói chuyện với chúng tôi
        </h1>
        <p style={{ color: '#6b7280', maxWidth: 600, margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.7 }}>
          Có câu hỏi về sản phẩm, đơn hàng hay hợp tác? Đội ngũ VeganGlow luôn sẵn sàng hỗ trợ bạn.
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: '2rem', alignItems: 'start' }}>
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
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
          style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 20, padding: '2rem', boxShadow: '0 12px 32px rgba(16,185,129,0.05)' }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a4d2e', marginBottom: '1.5rem' }}>Gửi tin nhắn</h2>

          {sent && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ padding: '12px 16px', background: '#d1fae5', color: '#065f46', borderRadius: 10, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}
            >
              <CheckCircle2 size={18} /> Cảm ơn bạn! Tin nhắn đã được gửi đi.
            </motion.div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Họ tên" name="name" required />
            <Field label="Email" name="email" type="email" required />
          </div>
          <Field label="Tiêu đề" name="subject" required />
          <Field label="Nội dung" name="message" textarea required />

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              padding: '0.9rem 1.5rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: submitting ? 0.7 : 1,
              transition: 'transform 0.2s ease',
            }}
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
      whileHover={{ y: -4, boxShadow: '0 16px 32px rgba(16,185,129,0.10)' }}
      style={{
        display: 'flex',
        gap: '1rem',
        padding: '1.25rem',
        background: 'white',
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        transition: 'border-color 0.2s ease',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ color: '#1f2937', fontWeight: 600, marginTop: 2 }}>{value}</div>
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
  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    outline: 'none',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    backgroundColor: 'white',
  };
  return (
    <div style={{ marginTop: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {textarea ? (
        <textarea name={name} required={required} rows={5} style={baseStyle} />
      ) : (
        <input name={name} type={type} required={required} style={baseStyle} />
      )}
    </div>
  );
}
