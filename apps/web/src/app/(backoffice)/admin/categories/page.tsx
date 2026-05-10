import { listCategoriesWithCounts } from '@/lib/admin/queries/categories';
import shared from '../admin-shared.module.css';
import { CategoriesClient } from './_components/CategoriesClient';

export default async function AdminCategories({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined;

  const categories = await listCategoriesWithCounts(q);

  return (
    <div className={shared.page}>
      <div className={shared.toolbar}>
        <div style={{ flex: 1 }}>
          <form method="GET" action="/admin/categories" style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="search" 
              name="q" 
              placeholder="Tìm danh mục, slug..." 
              defaultValue={q}
              className={shared.input} 
              style={{ height: '36px', fontSize: '14px', width: '250px' }}
            />
            <button type="submit" className={shared.btnSecondary} style={{ height: '36px', fontSize: '13px' }}>
              Tìm
            </button>
            {q && (
              <a href="/admin/categories" className={shared.btnSecondary} style={{ height: '36px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                Xóa lọc
              </a>
            )}
          </form>
        </div>
      </div>

      <CategoriesClient categories={categories} />
    </div>
  );
}
