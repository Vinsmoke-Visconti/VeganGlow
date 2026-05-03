// Edge Function: Checkout
// POST /functions/v1/checkout
// Body: {
//   idempotency_key?: string,
//   items: [{ product_id, quantity }],
//   customer_name, phone, email?, address,
//   ward?, ward_code?, province?, province_code?, city?,
//   payment_method
// }

import { corsHeaders } from '../_shared/cors.ts';
import { createUserClient } from '../_shared/supabase.ts';

interface CheckoutItem {
  product_id: string;
  quantity: number;
}

interface CheckoutBody {
  idempotency_key?: string;
  items: CheckoutItem[];
  customer_name: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  ward?: string;
  ward_code?: string;
  province?: string;
  province_code?: string;
  payment_method: 'cod' | 'card' | 'bank_transfer';
  note?: string;
}

type NormalizedPaymentMethod = 'cod' | 'bank_transfer';

type RpcArgs = {
  p_customer: Record<string, string>;
  p_items: { id: string; quantity: number }[];
  p_payment_method: NormalizedPaymentMethod;
  p_idempotency_key: string;
};

type RpcOrder = {
  order_id: string;
  order_code: string;
  total_amount: number;
  reused?: boolean;
};

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function mapCheckoutError(message: string) {
  if (message.includes('INSUFFICIENT_STOCK:')) {
    const name = message.split('INSUFFICIENT_STOCK:')[1]?.trim() || 'product';
    return { status: 409, error: `Het hang: ${name}` };
  }
  if (message.includes('PRODUCT_INACTIVE')) return { status: 409, error: 'San pham khong con ban.' };
  if (message.includes('PRODUCT_NOT_FOUND')) return { status: 404, error: 'Khong tim thay san pham.' };
  if (message.includes('IDEMPOTENCY_KEY_REUSED')) {
    return { status: 409, error: 'Idempotency key was already used for another order.' };
  }
  if (message.includes('IDEMPOTENCY_IN_PROGRESS')) {
    return { status: 409, error: 'Order is still being processed. Retry shortly.' };
  }
  return { status: 400, error: message || 'Checkout failed.' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createUserClient(authHeader);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Invalid token' }, 401);
    }

    const body = (await req.json()) as Partial<CheckoutBody>;
    const idempotencyKey = req.headers.get('Idempotency-Key') ?? body.idempotency_key;

    if (!idempotencyKey) {
      return json({ error: 'Missing Idempotency-Key header.' }, 400);
    }

    if (!body.items || body.items.length === 0) {
      return json({ error: 'Cart is empty.' }, 400);
    }

    const paymentMethod: NormalizedPaymentMethod =
      body.payment_method === 'card' || body.payment_method === 'bank_transfer'
        ? 'bank_transfer'
        : 'cod';
    const province = body.province ?? body.city ?? '';
    const provinceCode = body.province_code ?? province;
    const ward = body.ward ?? 'unknown';
    const wardCode = body.ward_code ?? ward;

    const rpcArgs: RpcArgs = {
      p_customer: {
        name: body.customer_name ?? '',
        phone: body.phone ?? '',
        email: body.email ?? user.email ?? '',
        address: body.address ?? '',
        ward,
        ward_code: wardCode,
        province,
        province_code: provinceCode,
        note: body.note ?? '',
      },
      p_items: body.items.map((item: CheckoutItem) => ({
        id: item.product_id,
        quantity: item.quantity,
      })),
      p_payment_method: paymentMethod,
      p_idempotency_key: idempotencyKey,
    };

    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: 'decrement_stock_and_create_order',
        args: RpcArgs,
      ) => Promise<{ data: RpcOrder[] | null; error: { message: string } | null }>
    )('decrement_stock_and_create_order', rpcArgs);

    if (error || !data || data.length === 0) {
      const mapped = mapCheckoutError(error?.message ?? '');
      return json({ error: mapped.error }, mapped.status);
    }

    const order = data[0];
    return json(
      {
        success: true,
        order_code: order.order_code,
        order_id: order.order_id,
        reused: Boolean(order.reused),
      },
      order.reused ? 200 : 201,
    );
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Server error' },
      500,
    );
  }
});
