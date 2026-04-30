'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { getOrderPaymentStatus } from '@/app/actions/checkout';

export type PaymentStatusValue = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

interface UsePaymentStatusOptions {
  orderId: string | null;
  initial: PaymentStatusValue;
  enabled?: boolean;
  pollIntervalMs?: number;
}

/**
 * Watches an order's payment_status using Supabase Realtime as the primary
 * signal and a slow polling loop as a fallback for when Realtime drops.
 *
 * Returns the current status. Stops listening once a terminal state
 * (paid/failed/refunded) is reached.
 */
export function usePaymentStatus({
  orderId,
  initial,
  enabled = true,
  pollIntervalMs = 10_000,
}: UsePaymentStatusOptions): PaymentStatusValue {
  const [status, setStatus] = useState<PaymentStatusValue>(initial);
  const supabaseRef = useRef(createBrowserClient());

  useEffect(() => {
    setStatus(initial);
  }, [initial, orderId]);

  // Realtime subscription — primary signal.
  useEffect(() => {
    if (!enabled || !orderId) return;
    if (status === 'paid' || status === 'failed' || status === 'refunded') return;

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`order-payment:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const next = (payload.new as { payment_status?: PaymentStatusValue })
            .payment_status;
          if (next) setStatus(next);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, enabled, status]);

  // Polling fallback — only while pending and only if Realtime missed an event.
  useEffect(() => {
    if (!enabled || !orderId) return;
    if (status !== 'pending' && status !== 'unpaid') return;

    let cancelled = false;
    const id = window.setInterval(async () => {
      const result = await getOrderPaymentStatus(orderId);
      if (cancelled || !result.success) return;
      const next = result.payment_status as PaymentStatusValue;
      if (next && next !== status) setStatus(next);
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [orderId, enabled, status, pollIntervalMs]);

  return status;
}
