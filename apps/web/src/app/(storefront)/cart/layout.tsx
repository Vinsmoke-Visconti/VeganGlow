import { guardStaffFromStorefront } from '@/lib/security/guardStaffFromStorefront';

export default async function CartLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth: middleware redirects staff to /admin; this is the fallback.
  await guardStaffFromStorefront();
  return <>{children}</>;
}
