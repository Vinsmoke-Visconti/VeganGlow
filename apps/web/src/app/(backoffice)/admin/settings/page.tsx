import { getBrandInfo } from '@/lib/admin/queries/settings';
import shared from '../admin-shared.module.css';
import { SettingsClient } from './_components/SettingsClient';

export default async function AdminSettings() {
  const brand = await getBrandInfo();

  return (
    <div className={shared.page}>
      <SettingsClient brand={brand} />
    </div>
  );
}
