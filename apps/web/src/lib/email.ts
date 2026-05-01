import { Resend } from 'resend';
import { logger } from './logger';
import { buildVietQrUrl, isBankTransferMethod, type PaymentMethod } from './payment';

// Notification Service using Resend
// Requires RESEND_API_KEY in .env.local
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'invalid-email';
  return `${local.slice(0, 2)}***@${domain}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendOrderConfirmation(
  email: string,
  orderId: string,
  totalAmount: number,
  paymentMethod: PaymentMethod = 'cod'
) {
  try {
    logger.info(
      { action: 'send_email', email: maskEmail(email), orderId, paymentMethod },
      'Attempting to send order confirmation email'
    );

    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set. Mocking email delivery.');
      return { id: 'mock-id-' + Date.now() };
    }

    const isBankTransfer = isBankTransferMethod(paymentMethod);
    const safeOrderId = escapeHtml(orderId);
    const siteUrl = escapeHtml(process.env.NEXT_PUBLIC_SITE_URL || 'https://veganglow.vn');
    const vietQrUrl = isBankTransfer 
      ? buildVietQrUrl(totalAmount, orderId)
      : null;

    const { data, error } = await resend.emails.send({
      from: 'VeganGlow <onboarding@resend.dev>',
      to: [email],
      subject: `[VeganGlow] Xác nhận đơn hàng #${safeOrderId}`,
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #f8fafc;">
          <div style="background-color: #065e46; padding: 40px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 800;">Cảm ơn bạn đã đặt hàng!</h1>
            <p style="margin-top: 10px; opacity: 0.9; font-size: 16px;">Đơn hàng #${safeOrderId} đã được tiếp nhận</p>
          </div>
          
          <div style="padding: 40px; background-color: white;">
            <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px;">Xin chào,</p>
            <p style="font-size: 15px; color: #475569; line-height: 1.6;">
              Chúng tôi đã nhận được đơn hàng của bạn. Đội ngũ VeganGlow đang tiến hành kiểm tra và chuẩn bị sản phẩm để gửi tới bạn trong thời gian sớm nhất.
            </p>
            
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; margin: 32px 0;">
              <h3 style="margin-top: 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Chi tiết đơn hàng</h3>
              <table style="width: 100%; font-size: 15px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Mã đơn hàng:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">#${safeOrderId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Phương thức:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">
                    ${paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản ngân hàng'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Tổng thanh toán:</td>
                  <td style="padding: 8px 0; color: #059669; font-weight: 800; font-size: 18px; text-align: right;">
                    ${totalAmount.toLocaleString('vi-VN')}đ
                  </td>
                </tr>
              </table>
            </div>

            ${isBankTransfer ? `
              <div style="text-align: center; padding: 32px; border: 2px dashed #cbd5e1; border-radius: 16px; background-color: #fdfcfb;">
                <h3 style="margin: 0 0 16px 0; color: #0f172a;">Quét mã để thanh toán ngay</h3>
                <img src="${vietQrUrl}" alt="VietQR Payment" style="max-width: 280px; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
                <p style="margin-top: 16px; font-size: 14px; color: #64748b; line-height: 1.5;">
                  Vui lòng quét mã QR trên ứng dụng ngân hàng của bạn để hoàn tất thanh toán. 
                  <br/>Nội dung chuyển khoản đã được tạo sẵn.
                </p>
              </div>
            ` : ''}

            <div style="margin-top: 40px; text-align: center;">
              <a href="${siteUrl}/orders" 
                 style="display: inline-block; padding: 14px 32px; background-color: #059669; color: white; text-decoration: none; border-radius: 99px; font-weight: 700; font-size: 15px;">
                Theo dõi đơn hàng
              </a>
            </div>
          </div>
          
          <div style="padding: 30px; text-align: center; border-top: 1px solid #f1f5f9; background-color: #f8fafc;">
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
              Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ <a href="mailto:support@veganglow.vn" style="color: #059669; text-decoration: none;">support@veganglow.vn</a>
            </p>
            <p style="margin: 10px 0 0 0; font-size: 13px; color: #94a3b8;">&copy; 2026 VeganGlow. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (error) throw error;
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
    const displayName = escapeHtml(name || 'Quản trị viên');
    const safeIp = escapeHtml(metadata.ip || 'Không xác định');
    const safeUserAgent = escapeHtml(metadata.userAgent || 'Không xác định');

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
                <td style="padding: 6px 0; color: #1f2937; font-weight: 600;">${safeIp}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Thiết bị:</td>
                <td style="padding: 6px 0; color: #1f2937; font-size: 12px;">${safeUserAgent}</td>
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

/**
 * Gửi mã OTP xác nhận thiết lập hoặc đổi mật khẩu
 */
export async function sendPasswordOtpEmail(
  email: string,
  code: string,
  purpose: 'set_password' | 'change_password'
) {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set. Mocking OTP email delivery.');
      console.log(`[MOCK EMAIL] To: ${email}, OTP: ${code}, Purpose: ${purpose}`);
      return { id: 'mock-id-' + Date.now() };
    }

    const title = purpose === 'set_password' ? 'Thiết lập mật khẩu' : 'Thay đổi mật khẩu';
    const message = purpose === 'set_password' 
      ? 'Mã xác nhận thiết lập mật khẩu của bạn là:' 
      : 'Có yêu cầu thay đổi mật khẩu, mã xác nhận của bạn là:';

    const { data, error } = await resend.emails.send({
      from: 'VeganGlow Security <security@veganglow.vn>',
      to: [email],
      subject: `[VeganGlow] Mã xác nhận ${title}`,
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #065e46; padding: 32px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Bảo mật tài khoản</h1>
          </div>
          
          <div style="padding: 40px; text-align: center;">
            <p style="font-size: 16px; color: #475569; margin-bottom: 24px;">${message}</p>
            
            <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; display: inline-block; margin: 0 auto;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 0.2em; color: #065e46;">${escapeHtml(code)}</span>
            </div>
            
            <p style="margin-top: 32px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
              Mã này sẽ hết hạn sau 10 phút. <br/>
              Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này hoặc liên hệ bộ phận hỗ trợ.
            </p>
          </div>
          
          <div style="padding: 24px; text-align: center; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; 2026 VeganGlow. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error({ action: 'send_otp_email_error', error }, 'Failed to send OTP email');
    throw error;
  }
}

/**
 * Gửi email khi thanh toán thành công (PayOS / Chuyển khoản)
 */
export async function sendPaymentSuccessEmail(email: string, orderId: string, amount: number) {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set. Mocking payment success email.');
      return { id: 'mock-id-' + Date.now() };
    }

    const safeOrderId = escapeHtml(orderId);
    const siteUrl = escapeHtml(process.env.NEXT_PUBLIC_SITE_URL || 'https://veganglow.vn');

    const { data, error } = await resend.emails.send({
      from: 'VeganGlow <onboarding@resend.dev>',
      to: [email],
      subject: `[VeganGlow] Thanh toán thành công đơn hàng #${safeOrderId}`,
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #065e46; padding: 40px 20px; text-align: center; color: white;">
            <div style="width: 64px; height: 64px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 32px;">✓</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 800;">Thanh toán thành công!</h1>
            <p style="margin-top: 10px; opacity: 0.9; font-size: 16px;">Đơn hàng #${safeOrderId}</p>
          </div>
          
          <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
            <p style="font-size: 16px; margin-top: 0; margin-bottom: 24px;">Xin chào,</p>
            <p style="font-size: 15px; color: #475569;">Chúng tôi đã nhận được khoản thanh toán <strong>${amount.toLocaleString('vi-VN')}đ</strong> cho đơn hàng #${safeOrderId}.</p>
            <p style="font-size: 15px; color: #475569;">Hiện tại đội ngũ VeganGlow đang tiến hành đóng gói sản phẩm và sẽ sớm giao cho đơn vị vận chuyển.</p>
            
            <div style="margin: 40px 0; text-align: center;">
              <a href="${siteUrl}/orders" style="background-color: #065e46; color: white; padding: 14px 32px; text-decoration: none; border-radius: 99px; font-weight: 700; font-size: 15px; display: inline-block;">Xem tiến độ đơn hàng</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
            <p style="font-size: 14px; color: #64748b; margin: 0;">Trân trọng,<br>Đội ngũ VeganGlow</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">© 2026 VeganGlow. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (error) throw error;
    logger.info({ action: 'send_payment_success_email', orderId }, 'Payment success email sent');
    return data;
  } catch (error) {
    logger.error({ action: 'send_payment_success_email_error', error }, 'Failed to send payment success email');
    throw error;
  }
}

/**
 * Gửi email khi đơn hàng bắt đầu được vận chuyển
 */
export async function sendOrderShippedEmail(email: string, orderId: string, trackingUrl?: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set. Mocking order shipped email.');
      return { id: 'mock-id-' + Date.now() };
    }

    const safeOrderId = escapeHtml(orderId);
    const siteUrl = escapeHtml(process.env.NEXT_PUBLIC_SITE_URL || 'https://veganglow.vn');

    const { data, error } = await resend.emails.send({
      from: 'VeganGlow <onboarding@resend.dev>',
      to: [email],
      subject: `[VeganGlow] Đơn hàng #${safeOrderId} đang được giao đến bạn`,
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #065e46; padding: 40px 20px; text-align: center; color: white;">
            <div style="width: 64px; height: 64px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 32px;">🚚</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 800;">Đơn hàng đang trên đường giao!</h1>
            <p style="margin-top: 10px; opacity: 0.9; font-size: 16px;">Đơn hàng #${safeOrderId}</p>
          </div>
          
          <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
            <p style="font-size: 16px; margin-top: 0; margin-bottom: 24px;">Xin chào,</p>
            <p style="font-size: 15px; color: #475569;">Đơn hàng <strong>#${safeOrderId}</strong> của bạn đã được đóng gói cẩn thận và giao cho đơn vị vận chuyển.</p>
            <p style="font-size: 15px; color: #475569;">Bạn có thể theo dõi hành trình đơn hàng của mình qua nút bên dưới. Vui lòng chú ý điện thoại để shipper có thể liên lạc khi giao hàng.</p>
            
            <div style="margin: 40px 0; text-align: center;">
              ${trackingUrl ? `
                <a href="${escapeHtml(trackingUrl)}" style="background-color: #065e46; color: white; padding: 14px 32px; text-decoration: none; border-radius: 99px; font-weight: 700; font-size: 15px; display: inline-block;">Tra cứu vận đơn</a>
              ` : `
                <a href="${siteUrl}/orders" style="background-color: #065e46; color: white; padding: 14px 32px; text-decoration: none; border-radius: 99px; font-weight: 700; font-size: 15px; display: inline-block;">Kiểm tra đơn hàng</a>
              `}
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
            <p style="font-size: 14px; color: #64748b; margin: 0;">Trân trọng,<br>Đội ngũ VeganGlow</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">© 2026 VeganGlow. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (error) throw error;
    logger.info({ action: 'send_shipped_email', orderId }, 'Shipped email sent');
    return data;
  } catch (error) {
    logger.error({ action: 'send_shipped_email_error', error }, 'Failed to send shipped email');
    throw error;
  }
}
