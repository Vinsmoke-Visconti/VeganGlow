'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import styles from '../login/auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setFeedback(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFeedback({ kind: 'error', message: 'Email không hợp lệ.' });
      return;
    }

    setSubmitting(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?message=${encodeURIComponent('Mật khẩu đã được đặt lại.')}`,
    });
    setSubmitting(false);

    if (error) {
      setFeedback({ kind: 'error', message: error.message });
      return;
    }
    setFeedback({
      kind: 'success',
      message: 'Đã gửi email đặt lại mật khẩu! Vui lòng kiểm tra hộp thư.',
    });
    setEmail('');
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <Link
          href="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#10b981',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Quay lại đăng nhập
        </Link>

        <h1 className={styles.title}>Quên mật khẩu</h1>
        <p className={styles.subtitle}>
          Nhập email đăng ký, chúng tôi sẽ gửi cho bạn link đặt lại mật khẩu.
        </p>

        {feedback?.kind === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.error}
          >
            <AlertCircle size={18} />
            {feedback.message}
          </motion.div>
        )}
        {feedback?.kind === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '12px 14px',
              background: '#d1fae5',
              color: '#065f46',
              borderRadius: 10,
              marginBottom: '1rem',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={18} />
            {feedback.message}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              <Mail size={14} style={{ display: 'inline', marginRight: 4 }} />
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
              placeholder="you@example.com"
            />
          </div>

          <button type="submit" disabled={submitting} className={styles.button}>
            {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Gửi link đặt lại'}
          </button>
        </form>

        <p className={styles.footer}>
          Nhớ ra mật khẩu rồi? <Link href="/login" className={styles.link}>Đăng nhập</Link>
        </p>
      </motion.div>
    </div>
  );
}
