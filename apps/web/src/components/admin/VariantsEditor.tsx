'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { upsertVariant, deleteVariant, type VariantInput } from '@/app/actions/admin/variants';

export type VariantRow = {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price: number;
  compare_at_price: number | null;
  stock: number;
  image_url: string | null;
  position: number;
  is_active: boolean;
};

type Props = {
  productId: string;
  initialVariants: VariantRow[];
  defaultPrice: number;
};

type DraftVariant = Omit<VariantInput, 'product_id' | 'attributes'> & {
  attributesText: string; // user types "size=M;color=red"
};

function parseAttrs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  text.split(/[;,\n]/).forEach((pair) => {
    const [k, v] = pair.split('=').map((s) => s.trim());
    if (k && v) out[k] = v;
  });
  return out;
}

function stringifyAttrs(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function newDraft(position: number, defaultPrice: number): DraftVariant {
  return {
    id: undefined,
    sku: '',
    name: '',
    attributesText: '',
    price: defaultPrice,
    compare_at_price: null,
    stock: 0,
    image_url: null,
    position,
    is_active: true,
  };
}

export function VariantsEditor({ productId, initialVariants, defaultPrice }: Props) {
  const [drafts, setDrafts] = useState<DraftVariant[]>(
    initialVariants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      attributesText: stringifyAttrs(v.attributes),
      price: v.price,
      compare_at_price: v.compare_at_price,
      stock: v.stock,
      image_url: v.image_url,
      position: v.position,
      is_active: v.is_active,
    }))
  );
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const updateDraft = (idx: number, patch: Partial<DraftVariant>) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const save = (idx: number) => {
    const d = drafts[idx];
    startTransition(async () => {
      const result = await upsertVariant({
        id: d.id,
        product_id: productId,
        sku: d.sku,
        name: d.name,
        attributes: parseAttrs(d.attributesText),
        price: d.price,
        compare_at_price: d.compare_at_price,
        stock: d.stock,
        image_url: d.image_url,
        position: d.position,
        is_active: d.is_active,
      });
      if (result.ok) {
        setFeedback(`Đã lưu variant ${d.sku}`);
        if (!d.id && result.id) {
          updateDraft(idx, { id: result.id });
        }
      } else {
        setFeedback(`Lỗi: ${result.error}`);
      }
    });
  };

  const remove = (idx: number) => {
    const d = drafts[idx];
    if (!d.id) {
      setDrafts((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    if (!confirm(`Xoá variant ${d.sku}?`)) return;
    startTransition(async () => {
      const result = await deleteVariant(d.id!, productId);
      if (result.ok) {
        setDrafts((prev) => prev.filter((_, i) => i !== idx));
        setFeedback(`Đã xoá variant ${d.sku}`);
      } else {
        setFeedback(`Lỗi xoá: ${result.error}`);
      }
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Biến thể sản phẩm ({drafts.length})</h3>
        <button
          type="button"
          onClick={() => setDrafts((prev) => [...prev, newDraft(prev.length, defaultPrice)])}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#1a7f37', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          <Plus size={14} /> Thêm variant
        </button>
      </div>

      {feedback && <p style={{ color: feedback.startsWith('Lỗi') ? '#c0392b' : '#1a7f37', fontSize: 13 }}>{feedback}</p>}

      {drafts.length === 0 && (
        <p style={{ color: '#666', fontSize: 14, padding: 24, background: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
          Sản phẩm này chưa có biến thể. Thêm biến thể nếu cần bán theo size/màu/dung tích.
        </p>
      )}

      {drafts.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#fafafa' }}>
              <tr>
                <th style={th}>SKU</th>
                <th style={th}>Tên</th>
                <th style={th}>Thuộc tính (size=M; color=red)</th>
                <th style={th}>Giá</th>
                <th style={th}>Giá gốc</th>
                <th style={th}>Tồn kho</th>
                <th style={th}>Hoạt động</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d, idx) => (
                <tr key={d.id ?? `draft-${idx}`} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>
                    <input
                      type="text"
                      value={d.sku}
                      onChange={(e) => updateDraft(idx, { sku: e.target.value })}
                      style={input}
                      placeholder="SKU-001-M-RED"
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="text"
                      value={d.name}
                      onChange={(e) => updateDraft(idx, { name: e.target.value })}
                      style={input}
                      placeholder="Size M / Đỏ"
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="text"
                      value={d.attributesText}
                      onChange={(e) => updateDraft(idx, { attributesText: e.target.value })}
                      style={input}
                      placeholder="size=M; color=red; volume=50ml"
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      value={d.price}
                      onChange={(e) => updateDraft(idx, { price: Number(e.target.value) })}
                      style={{ ...input, width: 100 }}
                      min={0}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      value={d.compare_at_price ?? ''}
                      onChange={(e) => updateDraft(idx, { compare_at_price: e.target.value ? Number(e.target.value) : null })}
                      style={{ ...input, width: 100 }}
                      min={0}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      value={d.stock}
                      onChange={(e) => updateDraft(idx, { stock: Number(e.target.value) })}
                      style={{ ...input, width: 80 }}
                      min={0}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={d.is_active}
                      onChange={(e) => updateDraft(idx, { is_active: e.target.checked })}
                    />
                  </td>
                  <td style={td}>
                    <button
                      type="button"
                      onClick={() => save(idx)}
                      disabled={pending}
                      style={{ ...btn, background: '#1a7f37', color: '#fff' }}
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
      )}
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
const btn: React.CSSProperties = {
  padding: 6,
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
