import { ChallengeForm } from './_components/ChallengeForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Xác thực 2FA - Admin' };

export default function MfaChallengePage() {
  return (
    <main
      style={{
        maxWidth: 380,
        margin: '60px auto',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 22 }}>Xác thực 2 lớp</h1>
      <p style={{ color: '#555', fontSize: 14 }}>
        Nhập mã 6 chữ số từ ứng dụng Authenticator của bạn.
      </p>
      <ChallengeForm />
      <p style={{ marginTop: 20, fontSize: 13 }}>
        Mất Authenticator?{' '}
        <Link href="/admin/recover" style={{ color: '#0969da' }}>
          Khôi phục bằng backup code
        </Link>
      </p>
    </main>
  );
}
