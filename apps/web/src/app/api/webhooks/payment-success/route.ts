import { NextResponse } from 'next/server';

/**
 * This route is DEPRECATED. Payment confirmation is handled by:
 *   - PayOS: Edge Function `payos-webhook` (Supabase)
 *   - Bank transfer: Edge Function `bank-transfer-webhook` (Supabase)
 *
 * Both webhooks call the `confirm_bank_transfer_payment` RPC which
 * atomically verifies signature, matches order, and updates payment_status.
 *
 * This endpoint is kept as a no-op to avoid 404s from any stale webhook
 * configurations. It does NOT process payments.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Payment webhooks are handled by Supabase Edge Functions.',
    },
    { status: 410 }, // 410 Gone
  );
}
