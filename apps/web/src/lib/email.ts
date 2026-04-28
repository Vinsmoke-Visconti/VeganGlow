import { Resend } from 'resend';
import { logger } from './logger';

// Notification Service using Resend
// Requires RESEND_API_KEY in .env.local
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export async function sendOrderConfirmation(email: string, orderId: string, totalAmount: number) {
  try {
    logger.info({ action: 'send_email', email, orderId }, 'Attempting to send order confirmation email');

    // In local development without a key, just log it
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set. Mocking email delivery.');
      return { id: 'mock-id-' + Date.now() };
    }

    const { data, error } = await resend.emails.send({
      from: 'VeganGlow <onboarding@resend.dev>',
      to: [email],
      subject: `[VeganGlow] Xác nhận đơn hàng #${orderId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Cảm ơn bạn đã đặt hàng!</h1>
          <p>Xin chào,</p>
          <p>Đơn hàng <strong>#${orderId}</strong> của bạn đã được hệ thống ghi nhận thành công.</p>
          <p>Tổng thanh toán: <strong>${totalAmount.toLocaleString('vi-VN')}đ</strong></p>
          <p>Chúng tôi đang đóng gói và sẽ giao hàng đến bạn trong thời gian sớm nhất.</p>
          <br/>
          <p>Trân trọng,<br/>Đội ngũ VeganGlow</p>
        </div>
      `,
    });

    if (error) {
      throw error;
    }

    logger.info({ action: 'send_email_success', id: data?.id }, 'Email sent successfully');
    return data;
  } catch (error) {
    logger.error({ action: 'send_email_error', error }, 'Failed to send email');
    throw error;
  }
}

/**
 * Gửi email cảnh báo khi có người đăng nhập vào hệ thống quản trị
 */
export async function sendAdminLoginAlert(email: string, name: string | null, metadata: { ip?: string; userAgent?: string }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set. Mocking admin login alert.');
      return { id: 'mock-id-' + Date.now() };
    }

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const displayName = name || 'Quản trị viên';

    const { data, error } = await resend.emails.send({
      from: 'VeganGlow Security <security@veganglow.vn>',
      to: [email],
      subject: '⚠️ CẢNH BÁO: Đăng nhập mới vào hệ thống quản trị',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 16px; padding: 32px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="background-color: #fef2f2; width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span style="font-size: 32px;">🛡️</span>
            </div>
            <h1 style="color: #991b1b; font-size: 24px; margin: 0;">Phát hiện đăng nhập mới</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Hệ thống bảo mật VeganGlow</p>
          </div>

          <p style="font-size: 16px; color: #1f2937;">Xin chào <strong>${displayName}</strong>,</p>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
            Chúng tôi ghi nhận một lượt đăng nhập thành công vào <strong>Admin Console</strong> của bạn.
          </p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">CHI TIẾT ĐĂNG NHẬP:</p>
            <table style="width: 100%; margin-top: 12px; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Thời gian:</td>
                <td style="padding: 6px 0; color: #1f2937; font-weight: 600;">${now}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Địa chỉ IP:</td>
                <td style="padding: 6px 0; color: #1f2937; font-weight: 600;">${metadata.ip || 'Không xác định'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Thiết bị:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 12px;">${metadata.userAgent || 'Không xác định'}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>Bạn không thực hiện việc này?</strong> Nếu đây là một hành động lạ, vui lòng đổi mật khẩu ngay lập tức hoặc liên hệ với Super Admin để khóa tài khoản.
            </p>
          </div>

          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
            Đây là email tự động từ hệ thống bảo mật VeganGlow. Vui lòng không trả lời email này.
          </p>
        </div>
      `,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error({ action: 'admin_login_alert_error', error }, 'Failed to send admin login alert');
    return null;
  }
}
