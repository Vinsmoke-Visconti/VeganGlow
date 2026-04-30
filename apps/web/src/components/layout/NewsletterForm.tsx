'use client';

import { useState } from 'react';
import { subscribeNewsletter } from '@/app/actions/newsletter';
import styles from '@/app/(storefront)/storefront-layout.module.css';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setStatus(null);

    const result = await subscribeNewsletter(email);
    setSubmitting(false);

    if (result.success) {
      setEmail('');
      setStatus({ ok: true, message: 'Cảm ơn bạn đã đăng ký nhận bản tin.' });
    } else {
      setStatus({ ok: false, message: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.newsletterForm}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email của bạn..."
          className={styles.newsletterInput}
          aria-label="Email đăng ký bản tin"
        />
        <button type="submit" disabled={submitting} className={styles.newsletterBtn}>
          {submitting ? '...' : 'Gửi'}
        </button>
      </div>
      {status && (
        <p
          style={{
            marginTop: '0.5rem',
            fontSize: '0.85rem',
            color: status.ok ? '#a7f3d0' : '#fecaca',
          }}
        >
          {status.message}
        </p>
      )}
    </form>
  );
}
