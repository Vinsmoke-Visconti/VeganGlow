import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import { listProducts, listAllCategories, type ProductListFilters } from '@/lib/admin/queries/products';
import { formatVND } from '@/lib/admin/format';
import { SafeImage } from '@/components/ui/SafeImage';
import shared from '../admin-shared.module.css';
import { ProductFilters } from './_components/ProductFilters';
import grid from './_components/ProductGrid.module.css';

type Props = { searchParams: Promise<ProductListFilters> };

function stockBadge(stock: number) {
  if (stock === 0) return { cls: 'badgeDanger', label: 'Hết hàng' };
  if (stock < 5) return { cls: 'badgeWarn', label: `Sắp hết: ${stock}` };
  return { cls: 'badgeSuccess', label: `Còn ${stock}` };
}

export default async function AdminProducts({ searchParams }: Props) {
  const filters = await searchParams;
  const [products, categories] = await Promise.all([listProducts(filters), listAllCategories()]);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Sản phẩm</h1>
          <p className={shared.pageSubtitle}>{products.length} sản phẩm</p>
        </div>
        <Link href="/admin/products/new" className={`${shared.btn} ${shared.btnPrimary}`}>
          <Plus size={14} /> Thêm sản phẩm
        </Link>
      </div>

      <ProductFilters defaults={filters} categories={categories} />

      {products.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Package size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có sản phẩm</p>
          <Link href="/admin/products/new" className={`${shared.btn} ${shared.btnPrimary}`} style={{ marginTop: 12 }}>
            <Plus size={14} /> Tạo sản phẩm đầu tiên
          </Link>
        </div>
      ) : (
        <div className={grid.grid}>
          {products.map((p) => {
            const badge = stockBadge(p.stock);
            return (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}`}
                className={`${grid.card} ${!p.is_active ? grid.inactive : ''}`}
              >
                <div className={grid.imageWrap}>
                  {p.image ? (
                    <SafeImage src={p.image} alt={p.name} className={grid.image} fallback="" />
                  ) : (
                    <Package size={40} />
                  )}
                </div>
                <h3 className={grid.cardName}>{p.name}</h3>
                <div className={grid.cardCategory}>{p.category?.name ?? 'Chưa phân loại'}</div>
                <div className={grid.cardFooter}>
                  <span className={grid.cardPrice}>{formatVND(p.price)}</span>
                  <span className={`${shared.badge} ${shared[badge.cls]}`}>{badge.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
