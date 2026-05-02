'use client';

import { useState } from 'react';
import RichTextViewer from './RichTextViewer';

interface ProductTabsProps {
  descriptionHtml?: string | null;
  descriptionPlain?: string | null;
  ingredients?: string | null;
}

type TabKey = 'desc' | 'ing' | 'usage';

const TAB_LABELS: Record<TabKey, string> = {
  desc: 'Mô tả chi tiết',
  ing: 'Thành phần',
  usage: 'Cách dùng',
};

const USAGE_DEFAULT =
  'Sau bước rửa mặt và toner, lấy một lượng vừa đủ thoa đều lên da theo chuyển động tròn từ trong ra ngoài. Sử dụng sáng và tối để đạt hiệu quả tốt nhất. Tránh tiếp xúc trực tiếp với mắt. Bảo quản nơi khô ráo, thoáng mát.';

export default function ProductTabs({ descriptionHtml, descriptionPlain, ingredients }: ProductTabsProps) {
  const [tab, setTab] = useState<TabKey>('desc');

  const html =
    descriptionHtml && descriptionHtml.trim().length > 0
      ? descriptionHtml
      : descriptionPlain
        ? `<p>${descriptionPlain}</p>`
        : '<p>Đang cập nhật mô tả sản phẩm.</p>';

  const ingredientChips = (ingredients ?? '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <section className="mt-20 lg:mt-32 max-w-3xl mx-auto px-2">
      <div role="tablist" aria-label="Thông tin sản phẩm" className="flex gap-6 sm:gap-10 border-b border-border-light overflow-x-auto">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setTab(key)}
              className={`shrink-0 -mb-px py-3 text-sm sm:text-base font-medium tracking-tight transition border-b-2 ${
                isActive ? 'border-text text-text' : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {TAB_LABELS[key]}
            </button>
          );
        })}
      </div>

      <div className="pt-8 pb-4 min-h-[180px]">
        {tab === 'desc' && <RichTextViewer html={html} />}

        {tab === 'ing' && (
          <div className="flex flex-col gap-4">
            {ingredientChips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {ingredientChips.map((chip, i) => (
                  <span
                    key={`${chip}-${i}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-50 text-sm text-primary-dark"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary leading-relaxed font-serif">Đang cập nhật danh sách thành phần.</p>
            )}
          </div>
        )}

        {tab === 'usage' && <p className="text-text-secondary leading-relaxed font-serif">{USAGE_DEFAULT}</p>}
      </div>
    </section>
  );
}
