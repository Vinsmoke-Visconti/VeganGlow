import { listStaff, listInvitations, listRoles } from '@/lib/admin/queries/staff';
import shared from '../admin-shared.module.css';
import { InviteStaffForm } from './_components/InviteStaffForm';
import { UsersClient } from './_components/UsersClient';

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined;

  const [staff, invitations, roles] = await Promise.all([listStaff(q), listInvitations(), listRoles()]);

  return (
    <div className={shared.page}>
      <div className={shared.toolbar}>
        <div style={{ flex: 1 }}>
          <form method="GET" action="/admin/users" style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="search" 
              name="q" 
              placeholder="Tìm nhân sự, email..." 
              defaultValue={q}
              className={shared.input} 
              style={{ height: '36px', fontSize: '14px', width: '250px' }}
            />
            <button type="submit" className={shared.btnSecondary} style={{ height: '36px', fontSize: '13px' }}>
              Tìm
            </button>
            {q && (
              <a href="/admin/users" className={shared.btnSecondary} style={{ height: '36px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                Xóa lọc
              </a>
            )}
          </form>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <InviteStaffForm roles={roles} />
        </div>
      </div>

      <UsersClient staff={staff} invitations={invitations} roles={roles} />
    </div>
  );
}
