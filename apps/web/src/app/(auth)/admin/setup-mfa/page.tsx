import { startMfaEnrollment } from '@/app/actions/admin/mfa';
import { SetupMfaForm } from './_components/SetupMfaForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Thiết lập 2FA - Admin' };

export default async function SetupMfaPage() {
  const enroll = await startMfaEnrollment();

  return (
    <main
      style={{
        maxWidth: 480,
        margin: '60px auto',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Thiết lập xác thực 2 lớp</h1>
      <p style={{ color: '#555', fontSize: 14, marginTop: 0 }}>
        Tài khoản Super Admin bắt buộc bật TOTP. Quét mã QR bằng Google Authenticator,
        1Password, Authy hoặc app tương tự.
      </p>

      <div
        style={{
          margin: '24px auto',
          width: 220,
          height: 220,
          background: '#fff',
          padding: 8,
          borderRadius: 12,
          border: '1px solid #eee',
        }}
        dangerouslySetInnerHTML={{ __html: enroll.qrSvg }}
      />

      <details style={{ fontSize: 13, color: '#666' }}>
        <summary style={{ cursor: 'pointer' }}>Không quét được? Nhập mã thủ công</summary>
        <code
          style={{
            display: 'block',
            marginTop: 8,
            padding: 12,
            background: '#f5f5f5',
            borderRadius: 6,
            wordBreak: 'break-all',
          }}
        >
          {enroll.secret}
        </code>
      </details>

      <SetupMfaForm factorId={enroll.factorId} />
    </main>
  );
}
