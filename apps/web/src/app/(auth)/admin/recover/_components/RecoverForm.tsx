'use client';

import { useActionState } from 'react';
import { recoverWithBackupCode } from '@/app/actions/admin/recover';

type State = { ok: boolean; error?: string; message?: string } | null;

export function RecoverForm() {
  const [state, action, isPending] = useActionState<State, FormData>(
    recoverWithBackupCode,
    null
  );
  return (
    <form action={action} style={{ marginTop: 16 }}>
      <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Email</label>
      <input
        name="email"
        type="email"
        required
        placeholder="email@veganglow.com"
        style={{ width: '100%', padding: 10, marginBottom: 12, fontSize: 14 }}
      />
      <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Backup code</label>
      <input
        name="code"
        required
        pattern="[A-F0-9]{4}-[A-F0-9]{4}"
        placeholder="ABCD-1234"
        style={{
          width: '100%',
          padding: 10,
          fontSize: 14,
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: 2,
        }}
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
        {isPending ? 'Đang xử lý…' : 'Khôi phục'}
      </button>
      {state?.error && (
        <p style={{ color: '#c0392b', marginTop: 12, fontSize: 14 }}>{state.error}</p>
      )}
      {state?.ok && state.message && (
        <p style={{ color: '#1a7f37', marginTop: 12, fontSize: 14 }}>{state.message}</p>
      )}
    </form>
  );
}
