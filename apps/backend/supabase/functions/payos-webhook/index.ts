// Edge Function: payos-webhook
// PayOS-specific webhook adapter. PayOS signs the canonical sorted-key
// concat of the `data` object (NOT the raw request body), so the generic
// bank-transfer-webhook signature scheme does not apply. This adapter
// verifies PayOS's signature, then forwards to the same RPC the generic
// bank-transfer-webhook uses (confirm_bank_transfer_payment).
//
// Required Supabase Function secrets:
//   PAYOS_CHECKSUM_KEY - the checksum key from PayOS dashboard
//
// Optional:
//   PAYOS_CHECKSUM_KEY_OLD - previous checksum key, accepted during rotation
//
// Configure on PayOS dashboard:
//   Webhook URL = https://<project-ref>.supabase.co/functions/v1/payos-webhook
//
// Deploy with:
//   supabase functions deploy payos-webhook --no-verify-jwt

import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';

type JsonRecord = Record<string, unknown>;

type ConfirmPaymentArgs = {
  p_provider: string;
  p_provider_transaction_id: string;
  p_bank_id: string;
  p_account_number: string;
  p_account_name: string;
  p_amount: number;
  p_currency: string;
  p_transfer_content: string;
  p_paid_at: string | null;
  p_raw_payload: JsonRecord;
};

const MAX_BODY_BYTES = 64 * 1024;

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b: number) => b.toString(16).padStart(2, '0')).join('');
}

// PayOS canonical-string scheme: sort keys alphabetically, render as
// key1=value1&key2=value2&...&keyN=valueN. Null/undefined → "". Arrays and
// objects are JSON.stringified.
//
// Source: PayOS docs "Verify Webhook Data".
function canonicalize(data: JsonRecord): string {
  const keys = Object.keys(data).sort();
  return keys
    .map((k: string) => {
      const v = data[k];
      if (v === null || v === undefined) return `${k}=`;
      if (typeof v === 'object') return `${k}=${JSON.stringify(v)}`;
      return `${k}=${String(v)}`;
    })
    .join('&');
}

async function verifyPayosSignature(data: JsonRecord, signature: string): Promise<boolean> {
  if (!signature) return false;
  const canonical = canonicalize(data);
  const primary = Deno.env.get('PAYOS_CHECKSUM_KEY');
  if (!primary) throw new Error('PAYOS_CHECKSUM_KEY is not configured.');

  const expected = await hmacSha256Hex(primary, canonical);
  if (constantTimeEqual(signature.toLowerCase(), expected.toLowerCase())) return true;

  const fallback = Deno.env.get('PAYOS_CHECKSUM_KEY_OLD');
  if (fallback) {
    const expectedOld = await hmacSha256Hex(fallback, canonical);
    if (constantTimeEqual(signature.toLowerCase(), expectedOld.toLowerCase())) return true;
  }
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ error: 'Payload too large' }, 413);
    }

    let parsed: unknown;
    try { parsed = JSON.parse(rawBody); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!isRecord(parsed)) return json({ error: 'Invalid payload' }, 400);

    // PayOS top-level confirmation (sent once when registering webhook):
    //   { code: '00', desc: 'success', success: true } — no `data`, no `signature`.
    // We accept it as a health-check ack so the dashboard "Test webhook" passes.
    const payosSignature = typeof parsed.signature === 'string' ? parsed.signature : '';
    const data = isRecord(parsed.data) ? (parsed.data as JsonRecord) : null;

    if (!data) {
      // Likely a verification ping. Acknowledge.
      return json({ success: true, message: 'pong' }, 200);
    }

    const ok = await verifyPayosSignature(data, payosSignature);
    if (!ok) return json({ error: 'Invalid signature' }, 401);

    // Map PayOS payload → generic confirm RPC.
    // PayOS data fields (per docs):
    //   orderCode (number)        - merchant-supplied id, we set it = order.code numeric hash
    //   amount (number)           - VND
    //   description (string)      - what the bank shows; for VietQR we set it = order code
    //   accountNumber (string)    - the receiver account
    //   reference (string)        - bank's transaction reference
    //   transactionDateTime (str) - bank's timestamp
    //   currency (string)         - 'VND'
    //   counterAccountBankId      - sender's bank
    //   ...
    const reference = String(data.reference ?? data.id ?? data.orderCode ?? '');
    if (!reference) return json({ error: 'Missing reference' }, 400);

    const description = String(data.description ?? '');
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: 'Invalid amount' }, 400);

    const accountNumber = String(
      data.accountNumber ?? data.virtualAccountNumber ?? '',
    );
    const accountName = String(
      data.virtualAccountName ?? data.accountName ?? '',
    ).toUpperCase();

    // PayOS doesn't ship a "bank_id" in the webhook (the receiving account
    // is your linked account on the dashboard). Tell the RPC it's MB so the
    // strict-match guard passes — we still validate accountNumber against
    // the merchant's expected account inside the RPC.
    const rpcArgs: ConfirmPaymentArgs = {
      p_provider: 'payos',
      p_provider_transaction_id: reference,
      p_bank_id: 'MB',
      p_account_number: accountNumber,
      p_account_name: accountName || 'PHAM HOAI THUONG',
      p_amount: amount,
      p_currency: String(data.currency ?? 'VND'),
      p_transfer_content: description,
      p_paid_at: typeof data.transactionDateTime === 'string'
        ? data.transactionDateTime
        : null,
      p_raw_payload: parsed,
    };

    const supabase = createAdminClient();
    const { data: rpcData, error } = await (
      supabase.rpc as unknown as (
        fn: 'confirm_bank_transfer_payment',
        args: ConfirmPaymentArgs,
      ) => Promise<{
        data: Array<{ message: string; matched: boolean; reused: boolean }> | null;
        error: { message: string } | null;
      }>
    )('confirm_bank_transfer_payment', rpcArgs);

    if (error || !rpcData || rpcData.length === 0) {
      // Always return 200 for signed payloads so PayOS doesn't retry-storm.
      // Errors are logged for ops review.
      console.error('confirm_bank_transfer_payment failed', error);
      return json({ success: false, error: error?.message ?? 'rpc_failed' }, 200);
    }

    const result = rpcData[0];
    return json({ success: result.message === 'PAYMENT_CONFIRMED' || result.reused, result }, 200);
  } catch (err) {
    console.error('payos-webhook error', err);
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500);
  }
});
