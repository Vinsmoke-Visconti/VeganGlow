import { listStaff, listInvitations, listRoles } from '@/lib/admin/queries/staff';
import shared from '../admin-shared.module.css';
import { UsersClient } from './_components/UsersClient';

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function AdminUsers({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined;

  const [staff, invitations, roles] = await Promise.all([listStaff(q), listInvitations(), listRoles()]);

  return (
    <div className={shared.page}>
      <UsersClient staff={staff} invitations={invitations} roles={roles} q={q} />
    </div>
  );
}
