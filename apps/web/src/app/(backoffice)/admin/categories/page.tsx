import { listCategoriesWithCounts } from '@/lib/admin/queries/categories';
import shared from '../admin-shared.module.css';
import { CategoriesClient } from './_components/CategoriesClient';

export default async function AdminCategories() {
  const categories = await listCategoriesWithCounts();

  return (
    <div className={shared.page}>


      <CategoriesClient categories={categories} />
    </div>
  );
}
