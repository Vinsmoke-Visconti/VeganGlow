'use client';

import { useState } from 'react';
import ProductCard, { type ProductCardProduct } from './ProductCard';
import { StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import { ChevronDown, TrendingUp } from 'lucide-react';
import styles from '@/app/(storefront)/page.module.css';

interface BestSellersProps {
  products: ProductCardProduct[];
}

export default function BestSellers({ products }: BestSellersProps) {
  const [displayCount, setDisplayCount] = useState(5);
  const hasMore = products.length > displayCount;

  const showMore = () => {
    setDisplayCount(prev => Math.min(prev + 5, products.length));
  };

  if (!products || products.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Chưa có dữ liệu bán hàng trong tháng này.</p>
      </div>
    );
  }

  return (
    <div className={styles.bestSellersWrap}>
      <StaggerContainer className={styles.productsGrid}>
        {products.slice(0, displayCount).map((p, index) => (
          <StaggerItem key={p.id}>
            <ProductCard product={p} priority={index < 4} />
            {/* Optional: Add a sales badge */}
            <div className={styles.salesBadge}>
               <TrendingUp size={12} /> Bán chạy
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {hasMore && (
        <div className={styles.viewAll} style={{ marginTop: '2rem' }}>
          <button 
            onClick={showMore}
            className={styles.btnSecondary}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              margin: '0 auto',
              padding: '12px 32px',
              cursor: 'pointer'
            }}
          >
            Xem thêm sản phẩm bán chạy <ChevronDown size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
