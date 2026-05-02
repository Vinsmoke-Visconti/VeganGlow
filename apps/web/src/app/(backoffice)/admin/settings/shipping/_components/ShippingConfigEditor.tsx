'use client';

import { useState, useTransition } from 'react';
import { updateShippingConfig, type ShippingConfig } from '@/app/actions/admin/shipping';

export function ShippingConfigEditor({ initial }: { initial: ShippingConfig }) {
  const [config, setConfig] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const save = () => {
    startTransition(async () => {
      const r = await updateShippingConfig(config);
      setFeedback(r.ok ? 'Đã lưu' : `Lỗi: ${r.error}`);
    });
  };

  return (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Ngưỡng freeship (VND)
        <input
          type="number"
          value={config.freeship_threshold_vnd}
          onChange={(e) =>
            setConfig({ ...config, freeship_threshold_vnd: Number(e.target.value) })
          }
          style={input}
        />
        <span style={{ fontSize: 11, color: '#888' }}>
          Đơn từ giá trị này được miễn phí ship
        </span>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Trọng lượng mặc định (kg/sản phẩm)
        <input
          type="number"
          step="0.1"
          value={config.default_weight_kg}
          onChange={(e) =>
            setConfig({ ...config, default_weight_kg: Number(e.target.value) })
          }
          style={input}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Tiền tệ
        <input
          type="text"
          value={config.currency}
          onChange={(e) => setConfig({ ...config, currency: e.target.value })}
          style={input}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Thời gian xử lý (giờ)
        <input
          type="number"
          value={config.estimated_processing_hours}
          onChange={(e) =>
            setConfig({ ...config, estimated_processing_hours: Number(e.target.value) })
          }
          style={input}
        />
      </label>

      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          style={{
            padding: '8px 16px',
            background: pending ? '#999' : '#1a7f37',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {pending ? 'Đang lưu…' : 'Lưu cấu hình'}
        </button>
        {feedback && (
          <span style={{ color: feedback.startsWith('Lỗi') ? '#c0392b' : '#1a7f37', fontSize: 13 }}>
            {feedback}
          </span>
        )}
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  padding: 8,
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
};
