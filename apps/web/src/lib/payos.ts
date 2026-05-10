import { PayOS } from '@payos/node';

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID!,
  apiKey: process.env.PAYOS_API_KEY!,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
});

export type PayOSPaymentLinkResult = {
  success: true;
  checkoutUrl: string;
  qrCode: string;
  orderCode: number;
} | {
  success: false;
  error: string;
};

/**
 * Create a PayOS payment link for an order.
 * The `orderCode` must be a positive integer — we derive it from the order code string.
 */
export async function createPayOSPaymentLink(opts: {
  orderCode: string;        // e.g. "VG-1234ABCD-FF00"
  amount: number;           // VND
  description: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PayOSPaymentLinkResult> {
  try {
    // PayOS requires orderCode to be a positive integer (max 9007199254740991)
    // Derive from hex parts of the VG-XXXX-XXXX code
    const numericCode = deriveNumericOrderCode(opts.orderCode);

    const paymentLink = await payos.paymentRequests.create({
      orderCode: numericCode,
      amount: Math.round(opts.amount),
      description: opts.description.slice(0, 25), // PayOS max 25 chars
      buyerName: opts.buyerName || undefined,
      buyerEmail: opts.buyerEmail || undefined,
      buyerPhone: opts.buyerPhone || undefined,
      items: opts.items.map((item) => ({
        name: item.name.slice(0, 256),
        quantity: item.quantity,
        price: Math.round(item.price),
      })),
      returnUrl: opts.returnUrl,
      cancelUrl: opts.cancelUrl,
    });

    return {
      success: true,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      orderCode: numericCode,
    };
  } catch (err) {
    console.error('PayOS createPaymentLink error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Không thể tạo link thanh toán PayOS.',
    };
  }
}

/**
 * Get payment link info from PayOS.
 */
export async function getPayOSPaymentInfo(orderCode: number) {
  try {
    const info = await payos.paymentRequests.get(orderCode);
    return { success: true as const, data: info };
  } catch (err) {
    console.error('PayOS getPaymentLinkInformation error:', err);
    return { success: false as const, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Cancel a PayOS payment link.
 */
export async function cancelPayOSPaymentLink(orderCode: number, reason?: string) {
  try {
    const result = await payos.paymentRequests.cancel(orderCode, reason);
    return { success: true as const, data: result };
  } catch (err) {
    console.error('PayOS cancelPaymentLink error:', err);
    return { success: false as const, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Derive a numeric order code from VG-HEXHEX-HEXHEX string.
 * PayOS requires positive integer, max ~9 quadrillion.
 * We take the hex digits, parse last 13 chars as hex → number.
 */
function deriveNumericOrderCode(vgCode: string): number {
  // Extract hex parts: VG-1A2B3C4D-FF00 → 1A2B3C4DFF00
  const hex = vgCode.replace(/^VG-/i, '').replace(/-/g, '');
  // Take last 13 hex chars to stay within safe integer range
  const trimmed = hex.slice(-13);
  const num = parseInt(trimmed, 16);
  // Ensure positive and within safe range
  return Math.abs(num % 9007199254740991) || Date.now();
}
