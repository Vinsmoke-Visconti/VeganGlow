'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import shared from '../../admin-shared.module.css';

export function CopyInviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/admin/invite/accept?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
      title="Copy link mời"
      style={{ padding: 4, height: 28, width: 28 }}
    >
      {copied ? <Check size={14} style={{ color: 'var(--vg-success-fg)' }} /> : <Copy size={14} />}
    </button>
  );
}
