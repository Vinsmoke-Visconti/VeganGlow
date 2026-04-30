import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { listAllCategories } from '@/lib/admin/queries/products';
import { ProductForm } from '../_components/ProductForm';
import shared from '../../admin-shared.module.css';

export default async function NewProductPage() {
  const categories = await listAllCategories();

  return (
    <div className={shared.page}>
      <Link href="/admin/products" className={`${shared.btn} ${shared.btnGhost}`}>
        <ChevronLeft size={14} /> Danh sách sản phẩm
      </Link>

      <ProductForm categories={categories} />
    </div>
  );
}
