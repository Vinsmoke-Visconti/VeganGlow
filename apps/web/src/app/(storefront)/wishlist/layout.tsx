import { guardStaffFromStorefront } from '@/lib/security/guardStaffFromStorefront';

export default async function WishlistLayout({ children }: { children: React.ReactNode }) {
  await guardStaffFromStorefront();
  return <>{children}</>;
}
