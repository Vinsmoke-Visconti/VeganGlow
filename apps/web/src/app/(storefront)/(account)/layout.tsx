import UserAccountLayout from '@/components/layout/UserAccountLayout';
import { guardStaffFromStorefront } from '@/lib/security/guardStaffFromStorefront';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth: middleware redirects, but if bypassed, render 404.
  await guardStaffFromStorefront();
  return <UserAccountLayout>{children}</UserAccountLayout>;
}
