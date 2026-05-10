import { NextRequest, NextResponse } from 'next/server';
import { sendPaymentSuccessEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

/**
 * Internal API for sending payment success emails.
 * Called by Supabase Edge Functions (PayOS/bank-transfer webhook) after
 * confirm_bank_transfer_payment RPC succeeds.
 *
 * Security: Requires WEBHOOK_INTERNAL_SECRET header to prevent external abuse.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.WEBHOOK_INTERNAL_SECRET;

    if (!expectedSecret || authHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, order_code, amount } = body;

    if (!email || !order_code || !amount) {
      return NextResponse.json({ error: 'Missing required fields: email, order_code, amount' }, { status: 400 });
    }

    await sendPaymentSuccessEmail(email, order_code, Number(amount));

    logger.info({ action: 'payment_success_email_sent', order_code }, 'Payment success email dispatched');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ action: 'payment_success_email_error', error }, 'Failed to send payment success email');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
