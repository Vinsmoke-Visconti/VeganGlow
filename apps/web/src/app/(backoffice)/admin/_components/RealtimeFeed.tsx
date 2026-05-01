'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { formatVND } from '@/lib/admin/format';

type FeedRow = {
  id: string;
  code: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
};

type Props = {
  initial: FeedRow[];
};

export function RealtimeFeed({ initial }: Props) {
  const [rows, setRows] = useState(initial);
  const [pulsing, setPulsing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newRow = payload.new as FeedRow;
          setRows((prev) => [newRow, ...prev].slice(0, 10));
          setPulsing((prev) => new Set(prev).add(newRow.id));
          setTimeout(() => {
            setPulsing((prev) => {
              const next = new Set(prev);
              next.delete(newRow.id);
              return next;
            });
          }, 3000);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as FeedRow;
          setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13 }}>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#1a7f37',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        <span style={{ color: '#666' }}>Realtime — đơn hàng cập nhật trực tiếp</span>
      </div>
      {rows.length === 0 ? (
        <p style={{ color: '#888', fontSize: 13 }}>Chưa có đơn nào.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r) => (
            <li
              key={r.id}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 13,
                background: pulsing.has(r.id) ? '#e8f5e8' : 'transparent',
                transition: 'background 1s',
                paddingLeft: 8,
                paddingRight: 8,
                borderRadius: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong>{r.code}</strong>
                <span style={{ color: '#1a7f37', fontWeight: 600 }}>{formatVND(r.total_amount)}</span>
              </div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                {r.customer_name} · {r.status}
              </div>
            </li>
          ))}
        </ul>
      )}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
