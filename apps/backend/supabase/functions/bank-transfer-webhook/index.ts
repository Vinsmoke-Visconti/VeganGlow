// Edge Function: bank-transfer-webhook
// Receives signed bank transaction callbacks and confirms matching VietQR orders.
//
// Required secret:
//   BANK_WEBHOOK_SECRET - shared HMAC-SHA256 secret with your bank/webhook provider.
//
// Expected signature header:
//   x-veganglow-signature: sha256=<hex>
// Also accepts x-webhook-signature or x-signature with either raw hex or sha256=hex.

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

type ConfirmPaymentResult = {
  order_id: string | null;
  order_code: string | null;
  transaction_id: string;
  payment_status: string | null;
  order_status: string | null;
  matched: boolean;
  reused: boolean;
  message: string;
};

const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_BANK_ID = 'MB';
const DEFAULT_BANK_ACCOUNT = '2111122227777';
const DEFAULT_BANK_NAME = 'PHAM HOAI THUONG';

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenedPayload(payload: JsonRecord): JsonRecord {
  const data = payload.data;
  if (isRecord(data)) return { ...payload, ...data };
  return payload;
}

function readString(payload: JsonRecord, keys: string[]): string {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function readAmount(payload: JsonRecord): number {
  const value =
    payload.amount ??
    payload.transferAmount ??
    payload.creditAmount ??
    payload.money ??
    payload.value;

  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '');
    return Number(normalized);
  }
  return Number.NaN;
}

function normalizeSignature(value: string): string {
  return value.trim().toLowerCase().replace(/^sha256=/, '');
}

function normalizeBank(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeAccount(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizeName(value: string): string {
  return value.toUpperCase().replace(/\s+/g, ' ').trim();
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = normalizeSignature(a);
  const right = normalizeSignature(b);
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function verifySignature(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get('BANK_WEBHOOK_SECRET');
  if (!secret) throw new Error('BANK_WEBHOOK_SECRET is not configured.');

  const received =
    req.headers.get('x-veganglow-signature') ??
    req.headers.get('x-webhook-signature') ??
    req.headers.get('x-signature') ??
    '';

  if (!received) return false;

  const expected = await hmacSha256Hex(secret, body);
  return timingSafeEqual(received, expected);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ error: 'Payload too large' }, 413);
    }

    const signatureOk = await verifySignature(req, rawBody);
    if (!signatureOk) {
      return json({ error: 'Invalid signature' }, 401);
    }

    const parsed = JSON.parse(rawBody) as unknown;
    if (!isRecord(parsed)) {
      return json({ error: 'Invalid JSON payload' }, 400);
    }

    const body = flattenedPayload(parsed);
    const expectedBankId = normalizeBank(Deno.env.get('PAYMENT_BANK_ID') ?? DEFAULT_BANK_ID);
    const expectedAccount = normalizeAccount(
      Deno.env.get('PAYMENT_BANK_ACCOUNT') ?? DEFAULT_BANK_ACCOUNT,
    );
    const expectedName = normalizeName(Deno.env.get('PAYMENT_BANK_NAME') ?? DEFAULT_BANK_NAME);

    const bankId = readString(body, ['bank_id', 'bankId', 'bankCode', 'bank', 'gateway']);
    const accountNumber = readString(body, [
      'account_number',
      'accountNumber',
      'accountNo',
      'bankAccount',
      'subAccId',
      'creditAccount',
    ]);
    const accountName = readString(body, [
      'account_name',
      'accountName',
      'ownerName',
      'beneficiary',
      'beneficiaryName',
    ]);

    const normalizedBank = normalizeBank(bankId);
    const normalizedAccount = normalizeAccount(accountNumber);
    const normalizedName = normalizeName(accountName);

    if (
      normalizedBank !== expectedBankId &&
      !(expectedBankId === 'MB' && normalizedBank === 'MBBANK')
    ) {
      return json({ error: 'Invalid destination bank' }, 400);
    }

    if (normalizedAccount !== expectedAccount) {
      return json({ error: 'Invalid destination account' }, 400);
    }

    if (normalizedName && normalizedName !== expectedName) {
      return json({ error: 'Invalid destination account name' }, 400);
    }

    const amount = readAmount(body);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: 'Invalid amount' }, 400);
    }

    const providerTransactionId = readString(body, [
      'provider_transaction_id',
      'transaction_id',
      'transactionId',
      'transactionID',
      'reference',
      'ref',
      'id',
      'tid',
    ]);
    if (!providerTransactionId) {
      return json({ error: 'Missing transaction id' }, 400);
    }

    const transferContent = readString(body, [
      'transfer_content',
      'transferContent',
      'content',
      'description',
      'desc',
      'addInfo',
      'remark',
    ]);
    if (!transferContent) {
      return json({ error: 'Missing transfer content' }, 400);
    }

    const paidAt =
      readString(body, ['paid_at', 'paidAt', 'transactionDate', 'transaction_time', 'time']) ||
      null;

    const rpcArgs: ConfirmPaymentArgs = {
      p_provider: readString(body, ['provider', 'source']) || 'bank-webhook',
      p_provider_transaction_id: providerTransactionId,
      p_bank_id: bankId,
      p_account_number: accountNumber,
      p_account_name: accountName || DEFAULT_BANK_NAME,
      p_amount: amount,
      p_currency: readString(body, ['currency']) || 'VND',
      p_transfer_content: transferContent,
      p_paid_at: paidAt,
      p_raw_payload: parsed,
    };

    const supabase = createAdminClient();
    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: 'confirm_bank_transfer_payment',
        args: ConfirmPaymentArgs,
      ) => Promise<{
        data: ConfirmPaymentResult[] | null;
        error: { message: string } | null;
      }>
    )('confirm_bank_transfer_payment', rpcArgs);

    if (error || !data || data.length === 0) {
      return json({ error: error?.message ?? 'Payment confirmation failed' }, 400);
    }

    const result = data[0];
    const ok = result.message === 'PAYMENT_CONFIRMED' || result.reused;
    return json({ success: ok, result }, ok ? 200 : 202);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Server error' },
      500,
    );
  }
});
