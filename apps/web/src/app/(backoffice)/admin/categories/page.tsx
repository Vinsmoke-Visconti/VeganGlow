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
      <CategoriesClient categories={categories} q={q} />
    </div>
  );
}
