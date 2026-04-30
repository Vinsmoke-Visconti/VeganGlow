'use client';

import { List, LayoutGrid } from 'lucide-react';
import shared from '../admin-shared.module.css';

export type ViewMode = 'table' | 'grid';

type Props = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
};

export function AdminViewSwitcher({ mode, onChange }: Props) {
  return (
    <div className={shared.viewToggle}>
      <button
        type="button"
        className={`${shared.viewToggleBtn} ${mode === 'table' ? shared.viewToggleBtnActive : ''}`}
        onClick={() => onChange('table')}
        title="Dạng bảng (Details)"
      >
        <List size={18} />
      </button>
      <button
        type="button"
        className={`${shared.viewToggleBtn} ${mode === 'grid' ? shared.viewToggleBtnActive : ''}`}
        onClick={() => onChange('grid')}
        title="Dạng lưới (Tiles)"
      >
        <LayoutGrid size={18} />
      </button>
    </div>
  );
}
