import UserAccountLayout from '@/components/layout/UserAccountLayout';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <UserAccountLayout>{children}</UserAccountLayout>;
}
