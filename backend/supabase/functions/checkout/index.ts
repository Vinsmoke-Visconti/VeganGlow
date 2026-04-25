// Edge Function: Checkout — Process order creation
// POST /functions/v1/checkout
// Body: { items: [{ product_id, quantity }], address, payment_method }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';

interface CheckoutItem {
  product_id: string;
  quantity: number;
}

interface CheckoutBody {
  items: CheckoutItem[];
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  payment_method: 'cod' | 'card';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createUserClient(authHeader);
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CheckoutBody = await req.json();

    // Validate items
    if (!body.items || body.items.length === 0) {
      return new Response(JSON.stringify({ error: 'Giỏ hàng trống' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch products and validate stock
    const productIds = body.items.map((i) => i.product_id);
    const { data: products, error: productsError } = await adminClient
      .from('products')
      .select('*')
      .in('id', productIds);

    if (productsError || !products) {
      return new Response(JSON.stringify({ error: 'Lỗi tải sản phẩm' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate total & prepare order items
    let totalAmount = 0;
    const orderItems = body.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) throw new Error(`Sản phẩm không tồn tại: ${item.product_id}`);
      if (product.stock < item.quantity) throw new Error(`Hết hàng: ${product.name}`);

      totalAmount += product.price * item.quantity;
      return {
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        unit_price: product.price,
        quantity: item.quantity,
      };
    });

    // Generate order code
    const code = `VG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create order
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .insert({
        code,
        user_id: user.id,
        customer_name: body.customer_name,
        phone: body.phone,
        address: body.address,
        city: body.city,
        payment_method: body.payment_method,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const { error: itemsError } = await adminClient
      .from('order_items')
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

    if (itemsError) throw itemsError;

    // Update stock
    for (const item of body.items) {
      await adminClient.rpc('', {}); // Stock update would go here
      await adminClient
        .from('products')
        .update({ stock: products.find((p) => p.id === item.product_id)!.stock - item.quantity })
        .eq('id', item.product_id);
    }

    return new Response(
      JSON.stringify({ success: true, order_code: order.code, order_id: order.id }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
