import { listTeamMembers } from '@/lib/admin/queries/team';
import shared from '../admin-shared.module.css';
import { TeamMembersClient } from './_components/TeamMembersClient';

export default async function AdminAboutTeam() {
  const members = await listTeamMembers();

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Tác giả &amp; Nhóm</h1>
          <p className={shared.pageSubtitle}>
            Quản lý đội ngũ hiển thị trên trang giới thiệu của VeganGlow
          </p>
        </div>
      </div>

      <TeamMembersClient members={members} />
    </div>
  );
}
