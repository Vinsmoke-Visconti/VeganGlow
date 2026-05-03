import { Resend } from 'resend';
import { logger } from './logger';
import { buildVietQrUrl, isBankTransferMethod, type PaymentMethod } from './payment';

// Notification Service using Resend
// Requires RESEND_API_KEY in .env.local
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

// In testing mode (unverified domain), Resend only allows sending to the owner's email.
// Set RESEND_TEST_EMAIL in .env.local to your verified testing email.
const TEST_RECIPIENT = process.env.RESEND_TEST_EMAIL || 'binmin81@gmail.com';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const HAS_VERIFIED_DOMAIN = process.env.RESEND_DOMAIN_VERIFIED === 'true';

// Default sender if domain is not verified
const DEFAULT_FROM = HAS_VERIFIED_DOMAIN 
  ? 'VeganGlow <hello@veganglow.vn>' 
  : 'VeganGlow <onboarding@resend.dev>';

const SECURITY_FROM = HAS_VERIFIED_DOMAIN
  ? 'VeganGlow Security <security@veganglow.vn>'
  : 'VeganGlow Security <onboarding@resend.dev>';

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

/**
 * Centralized email dispatcher to handle dev/prod differences and unverified domains
 */
async function dispatchEmail(options: {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  tags?: { name: string; value: string }[];
}) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not set. Mocking email delivery.');
    return { id: 'mock-id-' + Date.now() };
  }

  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const finalTo = toList;

  // The user explicitly requested to send emails directly to the intended recipients,
  // bypassing any sandbox redirection. Note that if the domain is unverified,
  // Resend will throw a 403 error for unverified recipients.
  const { data, error } = await resend.emails.send({
    ...options,
    to: finalTo,
    text: options.text || (options.html as string).replace(/<[^>]*>/g, ''),
  } as any);

  if (error) {
    logger.error({ action: 'send_email_error', error, to: finalTo }, 'Resend API error');
    
    // FALLBACK FOR LOCAL TESTING:
    // If Resend blocks the email (e.g., unverified domain in sandbox), 
    // we save the exact HTML to the Desktop so the user can see it and click the links!
    if (!IS_PRODUCTION) {
      try {
        const fs = require('fs');
        const path = require('path');
        const desktopPath = path.join(require('os').homedir(), 'Desktop', 'VeganGlow_Email_Preview.html');
        fs.writeFileSync(desktopPath, options.html);
        logger.info(`Email blocked by Resend. Saved preview to: ${desktopPath}`);
      } catch (fsErr) {
        console.error('Failed to save email preview to desktop', fsErr);
      }
    }

    throw error;
  }

  return data;
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

    const data = await dispatchEmail({
      from: DEFAULT_FROM,
      to: [email],
      subject: `🌱 Cảm ơn bạn đã đồng hành cùng VeganGlow - Đơn hàng #${safeOrderId} đã đặt thành công`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 24px; overflow: hidden; background-color: #ffffff; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #f1f5f9;">
          <div style="background: linear-gradient(135deg, #064e3b 0%, #059669 100%); padding: 60px 40px; text-align: center; color: white;">
            <div style="background: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 40px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <span style="font-size: 40px;">🛍️</span>
            </div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.03em;">Đặt hàng thành công!</h1>
            <p style="margin-top: 12px; opacity: 0.9; font-size: 18px; font-weight: 500;">Mã đơn hàng: #${safeOrderId}</p>
          </div>
          
          <div style="padding: 40px; background-color: white;">
            <p style="font-size: 18px; color: #1e293b; margin-top: 0; margin-bottom: 24px; font-weight: 600;">Xin chào,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.7; margin-bottom: 32px;">
              Cảm ơn bạn đã lựa chọn sản phẩm thuần chay từ VeganGlow. Đội ngũ của chúng mình đã nhận được đơn hàng và đang nhanh chóng chuẩn bị những sản phẩm tốt nhất để gửi đến bạn.
            </p>
            
            <div style="background-color: #f8fafc; border-radius: 20px; padding: 32px; margin-bottom: 40px; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #064e3b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; margin-bottom: 20px;">Tóm tắt đơn hàng</h3>
              <table style="width: 100%; font-size: 16px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">Phương thức thanh toán:</td>
                  <td style="padding: 12px 0; color: #0f172a; font-weight: 600; text-align: right; border-bottom: 1px solid #e2e8f0;">
                    ${paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0 0 0; color: #64748b; font-size: 18px;">Tổng cộng:</td>
                  <td style="padding: 20px 0 0 0; color: #059669; font-weight: 800; font-size: 24px; text-align: right;">
                    ${totalAmount.toLocaleString('vi-VN')}đ
                  </td>
                </tr>
              </table>
            </div>

            ${isBankTransfer ? `
              <div style="text-align: center; padding: 40px; border: 2px dashed #059669; border-radius: 24px; background-color: #f0fdf4; margin-bottom: 40px;">
                <h3 style="margin: 0 0 20px 0; color: #064e3b; font-size: 20px;">Quét mã QR để thanh toán</h3>
                <img src="${vietQrUrl}" alt="VietQR" style="max-width: 300px; height: auto; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);" />
                <p style="margin-top: 24px; font-size: 15px; color: #166534; line-height: 1.6; font-weight: 500;">
                  Vui lòng hoàn tất chuyển khoản để đơn hàng được xác nhận nhanh nhất.
                </p>
                <a href="${siteUrl}/checkout/pending/${safeOrderId}"
                   style="display: inline-block; margin-top: 20px; padding: 14px 32px; background-color: #059669; color: white; text-decoration: none; border-radius: 99px; font-weight: 700; font-size: 15px;">
                  Mở trang thanh toán
                </a>
              </div>
            ` : ''}

            <div style="text-align: center;">
              <a href="${isBankTransfer ? `${siteUrl}/checkout/pending/${safeOrderId}` : `${siteUrl}/checkout/success/${safeOrderId}`}"
                 style="display: inline-block; padding: 18px 40px; background-color: #064e3b; color: white; text-decoration: none; border-radius: 99px; font-weight: 700; font-size: 16px; box-shadow: 0 10px 20px rgba(6, 78, 59, 0.15); transition: transform 0.2s;">
                ${isBankTransfer ? 'Tiếp tục thanh toán' : 'Xem chi tiết đơn hàng'}
              </a>
            </div>
          </div>
          
          <div style="padding: 40px; text-align: center; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
              Bạn có câu hỏi? Liên hệ chúng mình tại <a href="mailto:support@veganglow.vn" style="color: #059669; text-decoration: none; font-weight: 600;">support@veganglow.vn</a>
            </p>
            <div style="margin-top: 24px;">
               <span style="font-size: 20px;">🌱</span>
            </div>
            <p style="margin: 12px 0 0 0; font-size: 13px; color: #cbd5e1; font-weight: 500;">&copy; 2026 VeganGlow - Vẻ đẹp thuần chay & Bền vững</p>
          </div>
        </div>
      `,
    });


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

    const data = await dispatchEmail({
      from: SECURITY_FROM,
      to: [email],
      subject: '🛡️ [VeganGlow Security] Phát hiện đăng nhập mới',
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 24px; overflow: hidden; background-color: #ffffff; border: 1px solid #fee2e2; box-shadow: 0 20px 40px rgba(0,0,0,0.05);">
          <div style="background-color: #991b1b; padding: 40px; text-align: center; color: white;">
            <div style="background: rgba(255,255,255,0.2); width: 64px; height: 64px; border-radius: 32px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span style="font-size: 32px;">🚨</span>
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Đăng nhập mới</h1>
            <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">Hệ thống bảo mật VeganGlow</p>
          </div>

          <div style="padding: 40px;">
            <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Xin chào <strong>${displayName}</strong>,</p>
            <p style="font-size: 15px; color: #475569; line-height: 1.6;">
              Tài khoản quản trị của bạn vừa được đăng nhập thành công. Vui lòng kiểm tra các thông tin bên dưới:
            </p>
            
            <div style="background-color: #f9fafb; padding: 24px; border-radius: 16px; margin: 32px 0; border: 1px solid #f1f5f9;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Thời gian:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: 700; text-align: right;">${now}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Địa chỉ IP:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: 700; text-align: right;">${safeIp}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Thiết bị:</td>
                  <td style="padding: 8px 0; color: #64748b; text-align: right; font-size: 12px; line-height: 1.4;">${safeUserAgent}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 20px; border-radius: 0 12px 12px 0;">
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #9a3412; font-weight: 700;">
                Bạn có nhận ra hoạt động đăng nhập này không?
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #9a3412; font-size: 14px; line-height: 1.6;">
                <li style="margin-bottom: 8px;"><strong>Nếu là bạn:</strong> Bạn không cần làm gì thêm. Email này chỉ nhằm mục đích bảo vệ tài khoản của bạn.</li>
                <li><strong>Nếu không phải là bạn:</strong> Tài khoản của bạn có thể đang bị xâm phạm! Hãy đổi mật khẩu ngay lập tức và liên hệ với Super Admin để khóa tài khoản.</li>
              </ul>
            </div>
          </div>

          <div style="padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; background-color: #f8fafc;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">Email này được gửi tự động để bảo vệ tài khoản của bạn.</p>
          </div>
        </div>
      `,
    });


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

    const data = await dispatchEmail({
      from: SECURITY_FROM,
      to: [email],
      subject: `🛡️ Mã xác nhận bảo mật [${code}] - VeganGlow`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; border-radius: 24px; overflow: hidden; background-color: #ffffff; border: 1px solid #f1f5f9; box-shadow: 0 20px 40px rgba(0,0,0,0.05);">
          <div style="background-color: #064e3b; padding: 40px; text-align: center; color: white;">
            <div style="background: rgba(255,255,255,0.15); width: 60px; height: 60px; border-radius: 30px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="font-size: 30px;">🔑</span>
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">${title}</h1>
          </div>
          
          <div style="padding: 40px; text-align: center;">
            <p style="font-size: 16px; color: #475569; margin-bottom: 32px; line-height: 1.6;">${message}</p>
            
            <div style="background-color: #f0fdf4; border: 2px solid #dcfce7; border-radius: 20px; padding: 24px 32px; display: inline-block;">
              <span style="font-size: 42px; font-weight: 900; letter-spacing: 0.3em; color: #064e3b; font-family: monospace;">${escapeHtml(code)}</span>
            </div>
            
            <div style="margin-top: 40px; padding: 20px; background-color: #fffbeb; border-radius: 12px; border: 1px solid #fef3c7;">
              <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 500;">
                Mã này có hiệu lực trong <strong>10 phút</strong>. Tuyệt đối không cung cấp mã này cho bất kỳ ai, kể cả nhân viên VeganGlow.
              </p>
            </div>
          </div>
          
          <div style="padding: 24px; text-align: center; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #cbd5e1; font-weight: 500;">&copy; 2026 VeganGlow Security Team</p>
          </div>
        </div>
      `,
    });


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

    const data = await dispatchEmail({
      from: DEFAULT_FROM,
      to: [email],
      subject: `💰 Xác nhận thanh toán thành công đơn hàng #${safeOrderId} - VeganGlow`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 24px; overflow: hidden; background-color: #ffffff; border: 1px solid #f1f5f9; box-shadow: 0 20px 40px rgba(0,0,0,0.06);">
          <div style="background-color: #059669; padding: 60px 40px; text-align: center; color: white;">
            <div style="background: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 40px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <span style="font-size: 40px;">✅</span>
            </div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.03em;">Thanh toán thành công!</h1>
            <p style="margin-top: 12px; opacity: 0.9; font-size: 18px; font-weight: 500;">Đơn hàng #${safeOrderId}</p>
          </div>
          
          <div style="padding: 40px;">
            <p style="font-size: 18px; color: #1e293b; margin-top: 0; margin-bottom: 24px; font-weight: 600;">Xin chào,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.7;">
              VeganGlow đã nhận được khoản thanh toán <strong>${amount.toLocaleString('vi-VN')}đ</strong> cho đơn hàng của bạn.
            </p>
            <p style="font-size: 16px; color: #475569; line-height: 1.7; margin-bottom: 40px;">
              Đơn hàng của bạn hiện đang được chuẩn bị để giao cho đơn vị vận chuyển. Chúng mình sẽ gửi email thông báo mã vận đơn ngay khi hàng được gửi đi.
            </p>
            
            <div style="text-align: center;">
              <a href="${siteUrl}/account/orders" 
                 style="display: inline-block; padding: 18px 44px; background-color: #064e3b; color: white; text-decoration: none; border-radius: 99px; font-weight: 800; font-size: 16px; box-shadow: 0 10px 25px rgba(6, 78, 59, 0.15);">
                Xem tiến độ đơn hàng
              </a>
            </div>
          </div>
          
          <div style="padding: 30px; text-align: center; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 13px; color: #94a3b8; font-weight: 500;">Cảm ơn bạn đã tin tưởng VeganGlow.</p>
          </div>
        </div>
      `,
    });


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

    const data = await dispatchEmail({
      from: DEFAULT_FROM,
      to: [email],
      subject: `🚚 Đơn hàng #${safeOrderId} đang trên đường tới bạn - VeganGlow`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 24px; overflow: hidden; background-color: #ffffff; border: 1px solid #f1f5f9; box-shadow: 0 20px 40px rgba(0,0,0,0.06);">
          <div style="background-color: #064e3b; padding: 60px 40px; text-align: center; color: white;">
            <div style="background: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 40px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <span style="font-size: 40px;">🚚</span>
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.03em;">Hàng đang được giao!</h1>
            <p style="margin-top: 12px; opacity: 0.9; font-size: 18px; font-weight: 500;">Đơn hàng #${safeOrderId}</p>
          </div>
          
          <div style="padding: 40px;">
            <p style="font-size: 18px; color: #1e293b; margin-top: 0; margin-bottom: 24px; font-weight: 600;">Xin chào,</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.7;">
              Đơn hàng của bạn đã được bàn giao cho đơn vị vận chuyển. Bạn hãy chuẩn bị tinh thần để nhận những món quà xinh xắn từ VeganGlow nhé!
            </p>
            
            <div style="margin: 40px 0; text-align: center;">
              ${trackingUrl ? `
                <a href="${escapeHtml(trackingUrl)}" style="background-color: #064e3b; color: white; padding: 18px 44px; text-decoration: none; border-radius: 99px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 10px 25px rgba(6, 78, 59, 0.15);">Tra cứu hành trình</a>
              ` : `
                <a href="${siteUrl}/account/orders" style="background-color: #064e3b; color: white; padding: 18px 44px; text-decoration: none; border-radius: 99px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 10px 25px rgba(6, 78, 59, 0.15);">Xem đơn hàng</a>
              `}
            </div>

            <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0;">
               <p style="margin: 0; font-size: 14px; color: #64748b; font-style: italic;">
                 Lưu ý: Bạn vui lòng để ý điện thoại để shipper có thể liên lạc thuận tiện nhất.
               </p>
            </div>
          </div>
          
          <div style="padding: 30px; text-align: center; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 500;">© 2026 VeganGlow. Hành trình sống xanh cùng bạn.</p>
          </div>
        </div>
      `,
    });


    logger.info({ action: 'send_shipped_email', orderId }, 'Shipped email sent');
    return data;
  } catch (error) {
    logger.error({ action: 'send_shipped_email_error', error }, 'Failed to send shipped email');
    throw error;
  }
}

/**
 * Gửi email mời nhân sự tham gia hệ thống quản trị
 */
export async function sendStaffInvitationEmail(
  email: string, 
  fullName: string, 
  roleName: string, 
  token: string
) {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set. Mocking staff invitation email.');
      console.log(`[MOCK EMAIL] Invitation to ${email} as ${roleName}. Token: ${token}`);
      return { id: 'mock-id-' + Date.now() };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://veganglow.vercel.app';
    const acceptUrl = `${siteUrl}/admin/invite/accept?token=${token}`;
    const safeName = escapeHtml(fullName);
    const safeRole = escapeHtml(roleName);

    const data = await dispatchEmail({
      from: DEFAULT_FROM,
      to: [email],
      subject: `✉️ Lời mời tham gia quản trị hệ thống VeganGlow`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 24px; overflow: hidden; background-color: #ffffff; border: 1px solid #f1f5f9; box-shadow: 0 20px 40px rgba(0,0,0,0.08);">
          <div style="background-color: #064e3b; padding: 60px 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.03em;">Gia nhập Đội ngũ</h1>
            <p style="margin-top: 12px; opacity: 0.9; font-size: 18px; font-weight: 500;">VeganGlow Admin Console</p>
          </div>
          
          <div style="padding: 40px; color: #1e293b; line-height: 1.8;">
            <p style="font-size: 18px; margin-top: 0; font-weight: 700; color: #064e3b;">Xin chào ${safeName},</p>
            <p style="font-size: 16px; color: #475569;">
              Bạn vừa nhận được lời mời tham gia quản trị hệ thống <strong>VeganGlow</strong>. Đây là bước đầu tiên để chúng ta cùng nhau xây dựng cộng đồng thuần chay lớn mạnh.
            </p>
            
            <div style="background-color: #f1f5f9; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center; border: 1px dashed #cbd5e1;">
               <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Vai trò của bạn:</p>
               <span style="font-size: 20px; font-weight: 800; color: #064e3b;">${safeRole}</span>
            </div>
            
            <div style="text-align: center; margin-top: 40px;">
              <a href="${acceptUrl}" 
                 style="display: inline-block; padding: 20px 48px; background-color: #064e3b; color: white; text-decoration: none; border-radius: 99px; font-weight: 800; font-size: 16px; box-shadow: 0 10px 25px rgba(6, 78, 59, 0.2);">
                Chấp nhận lời mời & Thiết lập mật khẩu
              </a>
            </div>
            
            <p style="margin-top: 40px; font-size: 13px; color: #94a3b8; text-align: center;">
              Lời mời này có hiệu lực trong vòng <strong>7 ngày</strong>.
            </p>
          </div>
          
          <div style="padding: 30px; text-align: center; border-top: 1px solid #f1f5f9; background-color: #f8fafc;">
            <p style="margin: 0; font-size: 12px; color: #cbd5e1; font-weight: 500;">© 2026 VeganGlow Admin Console.</p>
          </div>
        </div>
      `,
    });


    logger.info({ action: 'send_invitation_email_success', email }, 'Staff invitation email sent');
    return data;
  } catch (error) {
    logger.error({ action: 'send_invitation_email_error', error }, 'Failed to send staff invitation email');
    throw error;
  }
}

/**
 * Gửi email chào mừng khi người dùng mới đăng ký thành công
 */
export async function sendWelcomeEmail(email: string, name: string | null) {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set. Mocking welcome email.');
      return { id: 'mock-id-' + Date.now() };
    }

    const displayName = escapeHtml(name || 'bạn');
    const siteUrl = escapeHtml(process.env.NEXT_PUBLIC_SITE_URL || 'https://veganglow.vercel.app');

    const data = await dispatchEmail({
      from: DEFAULT_FROM,
      to: [email],
      subject: `🌱 Chào mừng ${displayName} gia nhập gia đình VeganGlow!`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 32px; overflow: hidden; background-color: #ffffff; box-shadow: 0 30px 60px rgba(0,0,0,0.12); border: 1px solid #f1f5f9;">
          <div style="background: linear-gradient(135deg, #064e3b 0%, #059669 100%); padding: 80px 40px; text-align: center; color: white; position: relative;">
            <div style="position: absolute; top: 20px; right: 20px; font-size: 40px; opacity: 0.2;">✨</div>
            <div style="position: absolute; bottom: 20px; left: 20px; font-size: 40px; opacity: 0.2;">🌿</div>
            <h1 style="margin: 0; font-size: 36px; font-weight: 900; letter-spacing: -0.04em; line-height: 1.1;">Chào mừng bạn mới!</h1>
            <p style="margin-top: 16px; opacity: 0.95; font-size: 18px; font-weight: 500;">Gia nhập cộng đồng sống xanh cùng VeganGlow</p>
          </div>
          
          <div style="padding: 50px 40px; color: #1e293b; line-height: 1.8;">
            <p style="font-size: 20px; margin-top: 0; margin-bottom: 24px; color: #064e3b; font-weight: 700;">Xin chào ${displayName},</p>
            <p style="font-size: 16px; color: #475569;">Chúng mình rất vui mừng khi bạn lựa chọn đồng hành cùng VeganGlow trên hành trình chăm sóc vẻ đẹp thuần chay, tử tế và bền vững.</p>
            
            <div style="background: linear-gradient(to right, #f0fdf4, #ffffff); border-radius: 24px; padding: 32px; margin: 40px 0; border: 1px solid #dcfce7; position: relative; overflow: hidden;">
              <div style="position: absolute; top: -10px; right: -10px; font-size: 60px; opacity: 0.05;">🎁</div>
              <h3 style="margin-top: 0; color: #064e3b; font-size: 16px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; margin-bottom: 20px;">Món quà nhỏ cho bạn:</h3>
              <ul style="margin: 0; padding-left: 0; list-style: none; color: #166534; font-size: 16px; font-weight: 500;">
                <li style="margin-bottom: 12px; display: flex; align-items: center;">
                  <span style="margin-right: 12px;">✅</span> Giảm ngay 10% đơn đầu (Mã: <strong>VEGANNEW</strong>)
                </li>
                <li style="margin-bottom: 12px; display: flex; align-items: center;">
                  <span style="margin-right: 12px;">✅</span> Tích điểm đổi quà cho mỗi lượt mua hàng
                </li>
                <li style="display: flex; align-items: center;">
                  <span style="margin-right: 12px;">✅</span> Ưu tiên trải nghiệm sản phẩm mới
                </li>
              </ul>
            </div>

            <div style="background-color: #fff7ed; border-radius: 20px; padding: 24px; border: 1px solid #ffedd5; margin-bottom: 40px;">
              <p style="margin: 0; color: #9a3412; font-size: 15px; font-weight: 600; display: flex; align-items: center;">
                <span style="margin-right: 10px; font-size: 20px;">👤</span> 
                Vui lòng hoàn thiện thông tin cá nhân của bạn để chúng mình có thể gửi những phần quà bất ngờ vào dịp sinh nhật và tư vấn sản phẩm phù hợp nhất nhé!
              </p>
            </div>
            
            <div style="text-align: center;">
              <a href="${siteUrl}/account/profile" 
                 style="display: inline-block; padding: 20px 48px; background-color: #064e3b; color: white; text-decoration: none; border-radius: 99px; font-weight: 800; font-size: 16px; box-shadow: 0 15px 30px rgba(6, 78, 59, 0.2); transition: all 0.3s;">
                Hoàn thiện hồ sơ & Mua sắm ngay
              </a>
            </div>
          </div>
          
          <div style="padding: 40px; text-align: center; border-top: 1px solid #f1f5f9; background-color: #f8fafc;">
            <p style="margin: 0; font-size: 14px; color: #94a3b8; font-weight: 500;">Hành trình tử tế bắt đầu từ bạn.</p>
            <p style="margin: 12px 0 0 0; font-size: 12px; color: #cbd5e1; font-weight: 500;">&copy; 2026 VeganGlow. All rights reserved.</p>
          </div>
        </div>
      `,
    });


    return data;
  } catch (error) {
    logger.error({ action: 'send_welcome_email_error', error }, 'Failed to send welcome email');
    return null;
  }
}

/**
 * Gửi email xác nhận đã nhận được tin nhắn liên hệ từ khách hàng
 */
export async function sendContactConfirmationEmail(email: string, name: string, subject: string) {
  try {
    const safeName = escapeHtml(name);
    const safeSubject = escapeHtml(subject);

    const data = await dispatchEmail({
      from: DEFAULT_FROM,
      to: [email],
      subject: `📬 VeganGlow đã nhận được lời nhắn từ bạn: ${safeSubject}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 24px; overflow: hidden; background-color: #ffffff; border: 1px solid #f1f5f9; box-shadow: 0 20px 40px rgba(0,0,0,0.06);">
          <div style="background-color: #064e3b; padding: 60px 40px; text-align: center; color: white;">
            <div style="background: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 40px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <span style="font-size: 40px;">✉️</span>
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">Chúng mình đã nhận được lời nhắn!</h1>
          </div>
          
          <div style="padding: 40px; color: #1e293b; line-height: 1.8;">
            <p style="font-size: 18px; margin-top: 0; font-weight: 700; color: #064e3b;">Chào ${safeName},</p>
            <p style="font-size: 16px; color: #475569;">
              Cảm ơn bạn đã dành thời gian gửi phản hồi cho VeganGlow. Đội ngũ hỗ trợ của chúng mình đã nhận được tin nhắn với tiêu đề "<strong>${safeSubject}</strong>".
            </p>
            <p style="font-size: 16px; color: #475569; margin-bottom: 32px;">
              Chúng mình sẽ phản hồi bạn sớm nhất có thể (thông thường trong vòng 24h làm việc).
            </p>
            
            <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; text-align: center;">
               <p style="margin: 0; font-size: 14px; color: #64748b;">
                 Trong lúc chờ đợi, bạn có thể tham khảo mục <a href="${process.env.NEXT_PUBLIC_SITE_URL}/faq" style="color: #059669; font-weight: 600; text-decoration: none;">Câu hỏi thường gặp</a> để giải đáp nhanh các thắc mắc nhé.
               </p>
            </div>
          </div>
          
          <div style="padding: 30px; text-align: center; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #cbd5e1; font-weight: 500;">VeganGlow - Vẻ đẹp thuần chay & tử tế.</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    logger.error({ action: 'send_contact_confirmation_error', error, email }, 'Failed to send contact confirmation email');
    return null;
  }
}

/**
 * Thông báo cho Admin khi có tin nhắn liên hệ mới
 */
export async function sendAdminContactAlert(input: { name: string; email: string; subject: string; message: string }) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'support@veganglow.vn';
    const safeName = escapeHtml(input.name);
    const safeEmail = escapeHtml(input.email);
    const safeSubject = escapeHtml(input.subject);
    const safeMessage = escapeHtml(input.message);

    const data = await dispatchEmail({
      from: SECURITY_FROM,
      to: [adminEmail],
      subject: `🚨 [Contact Form] Tin nhắn mới từ ${safeName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Tin nhắn liên hệ mới</h2>
          <p><strong>Người gửi:</strong> ${safeName} (${safeEmail})</p>
          <p><strong>Tiêu đề:</strong> ${safeSubject}</p>
          <p><strong>Nội dung:</strong></p>
          <div style="padding: 15px; background: #f5f5f5; border-radius: 5px; white-space: pre-wrap;">${safeMessage}</div>
          <hr />
          <p style="font-size: 12px; color: #666;">Hệ thống thông báo VeganGlow</p>
        </div>
      `,
    });
  } catch (error) {
    logger.error({ action: 'send_admin_contact_alert_error', error }, 'Failed to send admin contact alert');
    return null;
  }
}
