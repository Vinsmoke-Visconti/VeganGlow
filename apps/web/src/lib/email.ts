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
