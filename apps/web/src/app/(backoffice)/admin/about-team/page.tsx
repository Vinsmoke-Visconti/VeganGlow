import shared from '../admin-shared.module.css';
import { TeamMembersClient } from './_components/TeamMembersClient';

export default async function AdminAboutTeam() {
  return (
    <div className={shared.page}>
      <TeamMembersClient />
    </div>
  );
}
