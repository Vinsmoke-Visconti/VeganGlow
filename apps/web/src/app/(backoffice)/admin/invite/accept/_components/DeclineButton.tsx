'use client';

import { useState, useTransition } from 'react';
import { declineStaffInvitation } from '@/app/actions/staff';
import { XCircle, Loader2 } from 'lucide-react';
import styles from '../accept.module.css';

export function DeclineButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const handleDecline = () => {
    if (!window.confirm('Bạn có chắc chắn muốn từ chối lời mời này không?')) return;
    
    startTransition(async () => {
      const res = await declineStaffInvitation(token);
      if (res.success) {
        setDone(true);
      } else {
        alert(res.error || 'Có lỗi xảy ra');
      }
    });
  };

  if (done) {
    return (
      <div className={styles.declinedMessage}>
        <XCircle size={16} /> Đã từ chối lời mời
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDecline}
      disabled={isPending}
      className={styles.btnSecondary}
      style={{ marginTop: '0.5rem', width: '100%' }}
    >
      {isPending ? <Loader2 size={16} className="animate-spin" /> : 'Từ chối lời mời'}
    </button>
  );
}
