import { createClient } from '@/lib/supabase/server';
import { formatDateShort } from '@/lib/admin/format';
import { CheckCircle2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { adminGoogleLogin } from '@/app/actions/auth';
import styles from './accept.module.css';

type InviteRow = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  expires_at: string;
  role: { display_name: string; name: string } | null;
  inviter: { full_name: string | null } | null;
};

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <AlertCircle className={styles.errorIcon} size={48} />
          <h1 className={styles.title}>Thiếu mã lời mời</h1>
          <p className={styles.description}>
            Vui lòng kiểm tra lại đường link trong email của bạn. Nếu bạn cho rằng đây là lỗi, hãy liên hệ với quản trị viên.
          </p>
          <Link href="/" className={styles.btnSecondary}>Quay về trang chủ</Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  // Find invitation
  const { data: invite, error } = await supabase
    .from('staff_invitations')
    .select(`
      *,
      role:roles(display_name, name),
      inviter:profiles!staff_invitations_invited_by_fkey(full_name)
    `)
    .eq('token', token)
    .single<InviteRow>();

  if (error || !invite) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <AlertCircle className={styles.errorIcon} size={48} />
          <h1 className={styles.title}>Lời mời không hợp lệ</h1>
          <p className={styles.description}>
            Mã lời mời này không tồn tại hoặc đã bị thu hồi.
          </p>
          <Link href="/" className={styles.btnSecondary}>Quay về trang chủ</Link>
        </div>
      </div>
    );
  }

  const isExpired = new Date(invite.expires_at) < new Date();
  const isAccepted = invite.status === 'accepted';

  if (isExpired && !isAccepted) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <AlertCircle className={styles.errorIcon} size={48} />
          <h1 className={styles.title}>Lời mời đã hết hạn</h1>
          <p className={styles.description}>
            Lời mời này đã hết hạn vào ngày {formatDateShort(invite.expires_at)}. Vui lòng yêu cầu quản trị viên gửi lại lời mời mới.
          </p>
          <Link href="/" className={styles.btnSecondary}>Quay về trang chủ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.badge}>
          <ShieldCheck size={14} /> Hệ thống quản trị VeganGlow
        </div>
        
        {isAccepted ? (
          <>
            <CheckCircle2 className={styles.successIcon} size={48} />
            <h1 className={styles.title}>Bạn đã tham gia!</h1>
            <p className={styles.description}>
              Tài khoản của bạn đã được kích hoạt với vai trò <strong>{invite.role?.display_name}</strong>.
            </p>
            <div className={styles.actions}>
              <Link href="/admin" className={styles.btnPrimary}>
                Đi tới Dashboard <ArrowRight size={16} />
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className={styles.welcomeHeader}>
              <h1 className={styles.title}>Chào mừng, {invite.full_name}!</h1>
              <p className={styles.description}>
                <strong>{invite.inviter?.full_name || 'Quản trị viên'}</strong> đã mời bạn tham gia đội ngũ với vai trò:
              </p>
            </div>

            <div className={styles.roleHighlight}>
              <span className={styles.roleName}>{invite.role?.display_name}</span>
            </div>

            <div className={styles.infoBox}>
              <p>Để hoàn tất, vui lòng đăng nhập bằng email: <br/> <strong>{invite.email}</strong></p>
            </div>

            <div className={styles.actions}>
              <form action={adminGoogleLogin}>
                <button type="submit" className={styles.btnPrimary} style={{ cursor: 'pointer', width: '100%' }}>
                  Đăng nhập bằng Google <ArrowRight size={16} style={{ display: 'inline', marginLeft: 8 }} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
