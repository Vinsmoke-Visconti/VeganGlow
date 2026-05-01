'use client';

import { useState, useTransition } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  upsertShippingRate,
  deleteShippingRate,
  type ShippingRateInput,
} from '@/app/actions/admin/shipping';
import type { ShippingRateRow } from '@/lib/admin/queries/shipping';

type Draft = ShippingRateInput & { dirty?: boolean };

function rowToDraft(r: ShippingRateRow): Draft {
  return { ...r };
}

function newDraft(): Draft {
  return {
    province_code: '',
    province_name: '',
    base_fee: 30000,
    per_kg_fee: 5000,
    estimated_days: 3,
    is_active: true,
    notes: null,
  };
}

export function ShippingRatesEditor({ initial }: { initial: ShippingRateRow[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(initial.map(rowToDraft));
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const update = (idx: number, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch, dirty: true } : d)));
  };

  const save = (idx: number) => {
    const d = drafts[idx];
    startTransition(async () => {
      const r = await upsertShippingRate(d);
      if (r.ok) {
        setFeedback(`Đã lưu ${d.province_name}`);
        if (!d.id && r.id) update(idx, { id: r.id, dirty: false });
        else update(idx, { dirty: false });
      } else {
        setFeedback(`Lỗi: ${r.error}`);
      }
    });
  };

  const remove = (idx: number) => {
    const d = drafts[idx];
    if (!d.id) {
      setDrafts((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    if (!confirm(`Xoá phí ship cho ${d.province_name}?`)) return;
    startTransition(async () => {
      const r = await deleteShippingRate(d.id!, d.province_code);
      if (r.ok) {
        setDrafts((prev) => prev.filter((_, i) => i !== idx));
        setFeedback(`Đã xoá ${d.province_name}`);
      } else {
        setFeedback(`Lỗi xoá: ${r.error}`);
      }
    });
  };

  return (
    <div>
      {feedback && (
        <p style={{ color: feedback.startsWith('Lỗi') ? '#c0392b' : '#1a7f37', fontSize: 13 }}>
          {feedback}
        </p>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#fafafa' }}>
            <tr>
              <th style={th}>Mã tỉnh</th>
              <th style={th}>Tên</th>
              <th style={th}>Phí cơ bản (VND)</th>
              <th style={th}>Phí/kg phụ trội</th>
              <th style={th}>Ngày dự kiến</th>
              <th style={th}>Hoạt động</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d, idx) => (
              <tr
                key={d.id ?? `new-${idx}`}
                style={{ borderBottom: '1px solid #eee', background: d.dirty ? '#fffbe6' : 'transparent' }}
              >
                <td style={td}>
                  <input
                    type="text"
                    value={d.province_code}
                    onChange={(e) => update(idx, { province_code: e.target.value.toUpperCase() })}
                    style={{ ...input, width: 80 }}
                    placeholder="HN"
                    maxLength={10}
                  />
                </td>
                <td style={td}>
                  <input
                    type="text"
                    value={d.province_name}
                    onChange={(e) => update(idx, { province_name: e.target.value })}
                    style={input}
                    placeholder="Hà Nội"
                  />
                </td>
                <td style={td}>
                  <input
                    type="number"
                    value={d.base_fee}
                    onChange={(e) => update(idx, { base_fee: Number(e.target.value) })}
                    style={{ ...input, width: 110 }}
                    min={0}
                  />
                </td>
                <td style={td}>
                  <input
                    type="number"
                    value={d.per_kg_fee}
                    onChange={(e) => update(idx, { per_kg_fee: Number(e.target.value) })}
                    style={{ ...input, width: 100 }}
                    min={0}
                  />
                </td>
                <td style={td}>
                  <input
                    type="number"
                    value={d.estimated_days}
                    onChange={(e) => update(idx, { estimated_days: Number(e.target.value) })}
                    style={{ ...input, width: 70 }}
                    min={1}
                  />
                </td>
                <td style={td}>
                  <input
                    type="checkbox"
                    checked={d.is_active}
                    onChange={(e) => update(idx, { is_active: e.target.checked })}
                  />
                </td>
                <td style={td}>
                  <button
                    type="button"
                    onClick={() => save(idx)}
                    disabled={pending || !d.dirty}
                    style={{ ...btn, background: '#1a7f37', color: '#fff', opacity: d.dirty ? 1 : 0.5 }}
                  >
                    <Save size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    disabled={pending}
                    style={{ ...btn, marginLeft: 4, background: '#dc3545', color: '#fff' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => setDrafts((prev) => [...prev, newDraft()])}
        style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#1a7f37', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        <Plus size={14} /> Thêm tỉnh / vùng
      </button>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: 8,
  textAlign: 'left',
  borderBottom: '1px solid #ddd',
  fontWeight: 600,
};
const td: React.CSSProperties = { padding: 6 };
const input: React.CSSProperties = {
  width: '100%',
  padding: 6,
  border: '1px solid #ddd',
  borderRadius: 4,
  fontSize: 13,
};
const btn: React.CSSProperties = { padding: 6, border: 'none', borderRadius: 4, cursor: 'pointer' };
