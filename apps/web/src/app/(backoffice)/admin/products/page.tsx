import {
  listAllCategories,
  listProducts,
  type ProductListFilters,
  type ProductSortDirection,
  type ProductSortKey,
} from '@/lib/admin/queries/products';
import shared from '../admin-shared.module.css';
import { Suspense } from 'react';
import { ProductsClient } from './_components/ProductsClient';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from 'lucide-react';
import table from './_components/ProductGrid.module.css';

type Props = { searchParams: Promise<ProductListFilters> };

const DEFAULT_SORT_DIR: Record<ProductSortKey, ProductSortDirection> = {
  name: 'asc',
  sku: 'asc',
  category: 'asc',
  price: 'desc',
  stock: 'desc',
  status: 'desc',
  created_at: 'desc',
};

function sortHref(filters: ProductListFilters, sortKey: ProductSortKey) {
  const next = new URLSearchParams();
  if (filters.q) next.set('q', filters.q);
  if (filters.category) next.set('category', filters.category);
  if (filters.stock) next.set('stock', filters.stock);
  if (filters.status) next.set('status', filters.status);

  const currentSort = filters.sort ?? 'created_at';
  const currentDir: ProductSortDirection = filters.dir === 'asc' ? 'asc' : 'desc';
  const nextDir =
    currentSort === sortKey
      ? currentDir === 'asc'
        ? 'desc'
        : 'asc'
      : DEFAULT_SORT_DIR[sortKey];

  next.set('sort', sortKey);
  next.set('dir', nextDir);
  return `/admin/products?${next.toString()}`;
}

export default async function AdminProducts({ searchParams }: Props) {
  const filters = await searchParams;
  const [products, categories] = await Promise.all([listProducts(filters), listAllCategories()]);

  return (
    <div className={shared.page}>

      <Suspense fallback={<div className={shared.loadingSkeleton} style={{ height: '400px', borderRadius: 'var(--vg-radius-xl)' }} />}>
        <ProductsClient 
          products={products} 
          filters={filters} 
          categories={categories} 
        />
      </Suspense>
    </div>
  );
}
