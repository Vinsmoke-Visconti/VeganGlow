'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifyMfaEnrollment } from '@/app/actions/admin/mfa';

type State = { ok: boolean; error?: string; backupCodes?: string[] } | null;

export function SetupMfaForm({ factorId }: { factorId: string }) {
  const [state, action, isPending] = useActionState<State, FormData>(
    verifyMfaEnrollment,
    null
  );
  const [acked, setAcked] = useState(false);
  const router = useRouter();

  if (state?.ok && state.backupCodes && !acked) {
    return (
      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Lưu backup codes</h2>
        <p style={{ fontSize: 13, color: '#c0392b' }}>
          <strong>QUAN TRỌNG:</strong> Lưu các mã sau ở nơi an toàn (Lưu file, in
          ra giấy, hoặc cất trong password manager). Mỗi mã chỉ dùng được 1 lần.
        </p>
        <ul
          style={{
            background: '#f5f5f5',
            padding: 16,
            listStyle: 'none',
            borderRadius: 8,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 14,
          }}
        >
          {state.backupCodes.map((c) => (
            <li key={c} style={{ padding: '4px 0' }}>
              {c}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([state.backupCodes!.join('\n')], {
                type: 'text/plain',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'veganglow-backup-codes.txt';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Tải xuống .txt
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(state.backupCodes!.join('\n'));
            }}
          >
            Sao chép
          </button>
          <button
            type="button"
            onClick={() => {
              setAcked(true);
              router.replace('/admin');
            }}
            style={{ marginLeft: 'auto', fontWeight: 600 }}
          >
            Tôi đã lưu, vào dashboard
          </button>
        </div>
      </section>
    );
  }

  return (
    <form action={action} style={{ marginTop: 24 }}>
      <input type="hidden" name="factorId" value={factorId} />
      <label htmlFor="totp-code" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
        Mã 6 chữ số từ Authenticator
      </label>
      <input
        id="totp-code"
        name="code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        autoFocus
        required
        placeholder="123456"
        style={{ width: '100%', padding: 12, fontSize: 16, letterSpacing: 4, textAlign: 'center' }}
      />
      <button
        type="submit"
        disabled={isPending}
        style={{
          marginTop: 12,
          width: '100%',
          padding: 12,
          background: isPending ? '#999' : '#1a7f37',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
        }}
      >
        {isPending ? 'Đang xác thực…' : 'Xác nhận'}
      </button>
      {state?.error && (
        <p style={{ color: '#c0392b', marginTop: 12, fontSize: 14 }}>{state.error}</p>
      )}
    </form>
  );
}
