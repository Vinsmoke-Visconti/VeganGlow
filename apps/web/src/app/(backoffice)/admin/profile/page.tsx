import { redirect } from 'next/navigation';
import { Activity } from 'lucide-react';
import { getMyStaffProfile } from '@/lib/admin/queries/staff';
import { listMyAuditEntries } from '@/lib/admin/queries/audit';
import { formatRelative } from '@/lib/admin/format';
import shared from '../admin-shared.module.css';
import styles from './profile.module.css';
import { ProfileForm } from './_components/ProfileForm';

type StaffData = {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string;
  department: string | null;
  position: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: { display_name: string } | null;
};

export default async function AdminProfile() {
  const profile = (await getMyStaffProfile()) as StaffData | null;
  if (!profile) {
    redirect('/admin/login');
  }

  const audit = await listMyAuditEntries(50);
  const initial = profile.full_name.charAt(0).toUpperCase();

  return (
    <div className={shared.page}>


      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.headRow}>
            <div className={styles.avatar}>{initial}</div>
            <div>
              <h3 className={styles.name}>{profile.full_name}</h3>
              <p className={styles.email}>{profile.email}</p>
              {profile.position && (
                <p className={styles.position}>
                  {profile.position}
                  {profile.department ? ` · ${profile.department}` : ''}
                </p>
              )}
            </div>
          </div>
          <ProfileForm profile={profile} />
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>
            <Activity size={14} style={{ display: 'inline', marginRight: 6 }} />
            Hoạt động gần đây
          </h3>
          {audit.length === 0 ? (
            <p style={{ color: 'var(--vg-ink-500)', fontSize: 13 }}>Chưa có hoạt động nào.</p>
          ) : (
            <ul className={styles.activityList}>
              {audit.map((a) => (
                <li key={a.id} className={styles.activityItem}>
                  <div className={styles.activityDot} />
                  <div className={styles.activityBody}>
                    <p className={styles.activityText}>
                      <strong>{a.action}</strong>{' '}
                      {a.entity ? <span style={{ color: 'var(--vg-ink-500)' }}>{a.entity}</span> : null}
                    </p>
                    {a.summary && <p className={styles.activitySummary}>{a.summary}</p>}
                    <p className={styles.activityTime}>{formatRelative(a.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
