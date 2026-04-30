'use client';

import { useEffect, useRef, useState } from 'react';

const IDLE_MS = 30 * 60 * 1000;
const WARN_BEFORE_MS = 2 * 60 * 1000;
const PING_THROTTLE_MS = 60 * 1000;
const ACTIVITY_THROTTLE_MS = 5 * 1000;
const POLL_MS = 10_000;

/**
 * Tracks admin tab activity and pings the server every minute to refresh
 * the `admin_last_activity` cookie. Multi-tab synced via BroadcastChannel:
 * a busy tab keeps idle tabs alive.
 *
 * After IDLE_MS without activity in any tab, the user is force-redirected
 * to /admin/login?reason=idle (server middleware enforces the actual logout).
 *
 * Two minutes before expiry, shows a modal allowing "Tiếp tục" (resets timer)
 * or "Đăng xuất" (immediate redirect).
 */
export function IdleTimeoutGuard() {
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lastPingRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('admin-activity');
    channelRef.current = channel;

    const ping = () => {
      const now = Date.now();
      if (now - lastPingRef.current < PING_THROTTLE_MS) return;
      lastPingRef.current = now;
      fetch('/api/auth/ping', { method: 'POST' }).catch(() => {
        /* network blip — ignore */
      });
    };

    let activityThrottle = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - activityThrottle < ACTIVITY_THROTTLE_MS) return;
      activityThrottle = now;
      lastActivityRef.current = now;
      try {
        localStorage.setItem('admin_last_activity_local', String(now));
      } catch {
        /* localStorage may be disabled (incognito) — fine */
      }
      channel.postMessage({ type: 'activity', at: now });
      ping();
    };

    channel.onmessage = (e) => {
      if (e.data?.type === 'activity' && typeof e.data.at === 'number') {
        lastActivityRef.current = Math.max(lastActivityRef.current, e.data.at);
        if (showWarning) setShowWarning(false);
      }
    };

    const events: (keyof DocumentEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((ev) => document.addEventListener(ev, handleActivity, { passive: true }));

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_MS) {
        window.location.href = '/admin/login?reason=idle';
        return;
      }
      setShowWarning(idle > IDLE_MS - WARN_BEFORE_MS);
    }, POLL_MS);

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handleActivity));
      clearInterval(interval);
      channel.close();
    };
    // showWarning intentionally excluded — handler reads the latest via state setter callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!showWarning) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: 'var(--vg-bg, #fff)',
          padding: '24px',
          borderRadius: 12,
          maxWidth: 360,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        <h2 id="idle-warning-title" style={{ margin: 0, fontSize: 16 }}>
          Phiên sắp hết hạn
        </h2>
        <p style={{ marginTop: 8, fontSize: 14, color: 'var(--vg-ink-600, #555)' }}>
          Bạn sẽ tự động đăng xuất trong 2 phút nữa. Tiếp tục làm việc?
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/admin/login?reason=manual';
            }}
            style={{ padding: '8px 14px' }}
          >
            Đăng xuất
          </button>
          <button
            type="button"
            onClick={() => {
              const now = Date.now();
              lastActivityRef.current = now;
              channelRef.current?.postMessage({ type: 'activity', at: now });
              fetch('/api/auth/ping', { method: 'POST' }).catch(() => {});
              setShowWarning(false);
            }}
            style={{ padding: '8px 14px', fontWeight: 600 }}
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}
