import { getSiteAssets } from '@/lib/admin/queries/settings';
import shared from '../../admin-shared.module.css';
import { AppearanceClient } from './_components/AppearanceClient';

export const metadata = {
  title: 'Giao diện & Hình ảnh | Admin',
};

export default async function AdminAppearanceSettings() {
  const assets = await getSiteAssets();

  return (
    <div className={shared.page}>
      <div className={shared.header}>
        <h1 className={shared.title}>Giao diện & Hình ảnh</h1>
        <p className={shared.subtitle}>Quản lý các hình ảnh nền, logo và tài nguyên đồ họa của hệ thống.</p>
      </div>
      <AppearanceClient initialAssets={assets} />
    </div>
  );
}
