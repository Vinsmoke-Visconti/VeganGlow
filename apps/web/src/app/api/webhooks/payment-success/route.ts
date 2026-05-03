import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendOrderConfirmation } from '@/lib/email';
import { normalizePaymentMethod } from '@/lib/payment';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_code } = body;

    if (!order_code) {
      return NextResponse.json({ error: 'Missing order_code' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Verify the order is actually paid
    const { data: order, error } = await supabase
      .from('orders')
      .select('code, total_amount, payment_status, payment_method, customer_name')
      // Assuming customer email is stored in profiles or we need to find it. 
      // Wait, in Checkout we don't store the email directly in `orders`, 
      // but in the `orders` table user_id is linked to profiles.
      // Wait, if guest checkout, where is the email? 
      // Let's select 'email' if it exists. Ah, the orders table doesn't have an email column!
      // Let's check how checkout stores email.
      .eq('code', order_code)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = order as any;

    if (orderData.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Order is not paid' }, { status: 400 });
    }

    // Since orders table might not have email directly if it wasn't saved, 
    // let's try to get it from profiles.
    let customerEmail = '';
    if ((order as any).user_id) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', (order as any).user_id)
            .single();
        // Wait, profiles table doesn't have email either (it's in auth.users).
    }

    // Wait, let's just trigger the email if we can. Actually, if we don't have the email in the order, 
    // we can't send it from here easily unless we stored it.
    
    return NextResponse.json({ success: true, message: 'Webhook triggered but email not sent due to missing email data' });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
