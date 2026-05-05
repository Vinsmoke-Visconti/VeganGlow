import { getSiteAssets } from '@/lib/admin/queries/settings';
import shared from '../../admin-shared.module.css';
import { AppearanceClient } from './_components/AppearanceClient';

export const metadata = {
  title: 'Giao diện & Hình ảnh | Admin',
};

export default async function AdminAppearanceSettings() {
  const assets = await getSiteAssets();

  return (
    <div className={shared.page} style={{ padding: 0 }}>
      <AppearanceClient initialAssets={assets} />
    </div>
  );
}
