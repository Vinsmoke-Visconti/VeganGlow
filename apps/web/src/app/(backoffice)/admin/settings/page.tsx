import { getBrandInfo } from '@/lib/admin/queries/settings';
import shared from '../admin-shared.module.css';
import { BrandTab } from './_components/BrandTab';

export default async function AdminSettings() {
  const brand = await getBrandInfo();

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Cài đặt hệ thống</h1>
        </div>
      </div>

      <div style={{ maxWidth: 800 }}>
        <BrandTab initial={brand} />
      </div>
    </div>
  );
}
