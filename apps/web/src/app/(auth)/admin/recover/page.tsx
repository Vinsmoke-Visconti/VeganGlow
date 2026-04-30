import { RecoverForm } from './_components/RecoverForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Khôi phục 2FA - Admin' };

export default function RecoverPage() {
  return (
    <main
      style={{
        maxWidth: 420,
        margin: '60px auto',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 22 }}>Khôi phục bằng Backup Code</h1>
      <p style={{ color: '#555', fontSize: 14 }}>
        Nhập email và một mã backup (định dạng <code>ABCD-1234</code>). Sau khi xác thực,
        chúng tôi sẽ gửi link đăng nhập tới email của bạn để thiết lập lại Authenticator.
      </p>
      <RecoverForm />
    </main>
  );
}
