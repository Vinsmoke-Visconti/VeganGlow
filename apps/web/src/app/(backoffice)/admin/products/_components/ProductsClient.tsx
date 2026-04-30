'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Eye, ShoppingBag, CreditCard, Tag, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { formatVND } from '@/lib/admin/format';
import { SafeImage } from '@/components/ui/SafeImage';
import shared from '../../admin-shared.module.css';
import table from './ProductGrid.module.css';
import { AdminViewSwitcher, ViewMode } from '../../_components/AdminViewSwitcher';
import { ProductFilters } from './ProductFilters';
import { ProductRowActions } from './ProductRowActions';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  is_active: boolean;
  image: string | null;
  category: { name: string } | null;
};

type Props = {
  products: Product[];
  filters: any;
  categories: any[];
};

export function ProductsClient({ products, filters, categories }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const router = useRouter();

  const DEFAULT_SORT_DIR: any = {
    name: 'asc',
    sku: 'asc',
    category: 'asc',
    price: 'desc',
    stock: 'desc',
    status: 'desc',
    created_at: 'desc',
  };

  function sortHref(sortKey: string) {
    const next = new URLSearchParams();
    if (filters.q) next.set('q', filters.q);
    if (filters.category) next.set('category', filters.category);
    if (filters.stock) next.set('stock', filters.stock);
    if (filters.status) next.set('status', filters.status);

    const currentSort = filters.sort ?? 'created_at';
    const currentDir = filters.dir === 'asc' ? 'asc' : 'desc';
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

  const SortHeader = ({ sortKey, children }: { sortKey: string; children: React.ReactNode }) => {
    const active = (filters.sort ?? 'created_at') === sortKey;
    const dir = filters.dir === 'asc' ? 'asc' : 'desc';
    const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
      <Link
        href={sortHref(sortKey)}
        className={`${table.sortLink} ${active ? table.sortLinkActive : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <span>{children}</span>
        <Icon size={13} />
      </Link>
    );
  };

  function stockBadge(stock: number) {
    if (stock === 0) return { cls: 'badgeDanger', label: 'Hết hàng' };
    if (stock < 5) return { cls: 'badgeWarn', label: `Sắp hết: ${stock}` };
    return { cls: 'badgeSuccess', label: `Còn ${stock}` };
  }

  function productSku(id: string) {
    return `VG-${id.slice(0, 8).toUpperCase()}`;
  }

  function handleRowClick(id: string) {
    router.push(`/admin/products/${id}`);
  }

  return (
    <>
      <div className={shared.toolbar}>
        <ProductFilters defaults={filters} categories={categories} />
        <AdminViewSwitcher mode={viewMode} onChange={setViewMode} />
      </div>

      {products.length === 0 ? (
        <div className={shared.emptyState}>
          <div className={shared.emptyIcon}>
            <Package size={24} />
          </div>
          <p className={shared.emptyTitle}>Chưa có sản phẩm</p>
          <Link href="/admin/products/new" className={`${shared.btn} ${shared.btnPrimary}`} style={{ marginTop: 12 }}>
            Tạo sản phẩm đầu tiên
          </Link>
        </div>
      ) : viewMode === 'table' ? (
        <div className={shared.tableWrap}>
          <table className={`${shared.table} ${table.productTable}`}>
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>
                  <SortHeader sortKey="name">Tên sản phẩm</SortHeader>
                </th>
                <th>
                  <SortHeader sortKey="sku">SKU</SortHeader>
                </th>
                <th>
                  <SortHeader sortKey="category">Danh mục</SortHeader>
                </th>
                <th>
                  <SortHeader sortKey="price">Giá bán</SortHeader>
                </th>
                <th>
                  <SortHeader sortKey="stock">Tồn kho</SortHeader>
                </th>
                <th>
                  <SortHeader sortKey="status">Trạng thái</SortHeader>
                </th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const badge = stockBadge(p.stock);
                return (
                  <tr 
                    key={p.id} 
                    className={shared.clickableRow}
                    onClick={() => handleRowClick(p.id)}
                  >
                    <td>
                      <div className={table.thumb}>
                        {p.image ? (
                          <SafeImage src={p.image} alt={p.name} className={table.thumbImage} fallback="" />
                        ) : (
                          <Package size={20} />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={table.productName}>{p.name}</div>
                      <div className={table.productMeta}>{p.slug}</div>
                    </td>
                    <td>
                      <code className={table.sku}>{productSku(p.id)}</code>
                    </td>
                    <td>
                      <span className={table.category}>{p.category?.name ?? '—'}</span>
                    </td>
                    <td className={table.price}>{formatVND(p.price)}</td>
                    <td>
                      <span className={`${shared.badge} ${shared[badge.cls]}`}>{badge.label}</span>
                    </td>
                    <td>
                      <span className={`${shared.badge} ${p.is_active ? shared.badgeSuccess : shared.badgeMuted}`}>
                        {p.is_active ? 'Đang hiện' : 'Đang ẩn'}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <ProductRowActions id={p.id} name={p.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={shared.cardGrid}>
          {products.map((p) => {
            const badge = stockBadge(p.stock);
            return (
              <div 
                key={p.id} 
                className={shared.adminCard} 
                style={{ cursor: 'pointer' }}
                onClick={() => handleRowClick(p.id)}
              >
                <div className={shared.adminCardHeader}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--vg-parchment-200)' }}>
                       {p.image ? (
                         <SafeImage src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} fallback="" />
                       ) : (
                         <div style={{ width: '100%', height: '100%', background: 'var(--vg-parchment-50)', display: 'grid', placeItems: 'center' }}>
                            <Package size={24} className={shared.iconMuted} />
                         </div>
                       )}
                    </div>
                    <div style={{ flex: 1 }}>
                       <h3 className={shared.adminCardTitle} style={{ fontSize: 15 }}>{p.name}</h3>
                       <code style={{ fontSize: 10, color: 'var(--vg-ink-400)', letterSpacing: '0.05em' }}>{productSku(p.id)}</code>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ProductRowActions id={p.id} name={p.name} />
                  </div>
                </div>
                <div className={shared.adminCardContent}>
                   <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <div style={{ flex: 1 }}>
                         <div style={{ fontSize: 11, color: 'var(--vg-ink-400)', marginBottom: 2 }}>Giá bán</div>
                         <div style={{ fontWeight: 800, fontSize: 14 }}>{formatVND(p.price)}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                         <div style={{ fontSize: 11, color: 'var(--vg-ink-400)', marginBottom: 2 }}>Tồn kho</div>
                         <span className={`${shared.badge} ${shared[badge.cls]}`} style={{ fontSize: 10 }}>{badge.label}</span>
                      </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--vg-ink-600)', marginTop: 8 }}>
                      <Tag size={12} className={shared.iconMuted} />
                      {p.category?.name || 'Chưa phân loại'}
                   </div>
                </div>
                <div className={shared.adminCardFooter}>
                   <span className={`${shared.badge} ${p.is_active ? shared.badgeSuccess : shared.badgeMuted}`} style={{ fontSize: 10 }}>
                      {p.is_active ? 'Đang hiển thị' : 'Đang ẩn'}
                   </span>
                   <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--vg-leaf-700)' }}>
                     CHI TIẾT →
                   </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
