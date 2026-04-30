'use client';

import { useActionState } from 'react';
import { challengeMfa } from '@/app/actions/admin/mfa';

type State = { ok: boolean; error?: string } | null;

export function ChallengeForm() {
  const [state, action, isPending] = useActionState<State, FormData>(challengeMfa, null);
  return (
    <form action={action} style={{ marginTop: 16 }}>
      <label htmlFor="totp-code" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
        Mã xác thực
      </label>
      <input
        id="totp-code"
        name="code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        autoFocus
        required
        placeholder="123456"
        style={{
          width: '100%',
          padding: 12,
          fontSize: 18,
          letterSpacing: 6,
          textAlign: 'center',
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
        {isPending ? 'Đang xác thực…' : 'Xác nhận'}
      </button>
      {state?.error && (
        <p style={{ color: '#c0392b', marginTop: 12, fontSize: 14 }}>{state.error}</p>
      )}
    </form>
  );
}
