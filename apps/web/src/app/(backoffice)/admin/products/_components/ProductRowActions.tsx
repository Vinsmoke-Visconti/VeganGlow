'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Edit3, Loader2, Trash2 } from 'lucide-react';
import { deleteProduct } from '@/app/actions/admin/products';
import shared from '../../admin-shared.module.css';
import styles from './ProductGrid.module.css';

type Props = {
  id: string;
  name: string;
};

export function ProductRowActions({ id, name }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!confirm(`Xóa sản phẩm "${name}"? Hành động này không thể hoàn tác.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={styles.actions}>
      <Link
        href={`/admin/products/${id}`}
        className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
        title="Sửa sản phẩm"
        aria-label={`Sửa sản phẩm ${name}`}
      >
        <Edit3 size={15} />
      </Link>
      <button
        type="button"
        className={`${shared.btn} ${shared.btnDanger} ${shared.btnIcon}`}
        onClick={remove}
        disabled={pending}
        title="Xóa sản phẩm"
        aria-label={`Xóa sản phẩm ${name}`}
      >
        {pending ? <Loader2 size={15} /> : <Trash2 size={15} />}
      </button>
      {error && (
        <span className={styles.actionError} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
