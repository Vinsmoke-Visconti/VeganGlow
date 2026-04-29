import { listCategoriesWithCounts } from '@/lib/admin/queries/categories';
import shared from '../admin-shared.module.css';
import { CategoriesClient } from './_components/CategoriesClient';

export default async function AdminCategories() {
  const categories = await listCategoriesWithCounts();

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Danh mục sản phẩm</h1>
          <p className={shared.pageSubtitle}>{categories.length} danh mục</p>
        </div>
      </div>

      <CategoriesClient categories={categories} />
    </div>
  );
}
