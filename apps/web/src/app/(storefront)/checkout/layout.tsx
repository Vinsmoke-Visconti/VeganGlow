import { guardStaffFromStorefront } from '@/lib/security/guardStaffFromStorefront';

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  await guardStaffFromStorefront();
  return <>{children}</>;
}
