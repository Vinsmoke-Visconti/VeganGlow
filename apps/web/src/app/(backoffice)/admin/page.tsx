import type { DashboardRange } from '@/types/admin-dashboard';
import { fetchAdminDashboardSnapshotServer } from '@/lib/admin/queries/dashboard-snapshot';
import { AdminDashboardClient } from './_components/AdminDashboardClient';

type Props = { searchParams: Promise<{ range?: DashboardRange }> };

export default async function AdminDashboard({ searchParams }: Props) {
  const sp = await searchParams;
  const range: DashboardRange = sp.range === '7d' || sp.range === '30d' ? sp.range : 'today';
  const initialSnapshot = await fetchAdminDashboardSnapshotServer(range);

  return <AdminDashboardClient range={range} initialSnapshot={initialSnapshot} />;
}
