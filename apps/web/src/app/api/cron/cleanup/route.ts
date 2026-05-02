import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Distributed Scheduler endpoint
// This endpoint is meant to be called periodically (e.g., via Vercel Cron or pg_cron).
// Security: Require an Authorization header to prevent unauthorized executions.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    // In production, verify the CRON_SECRET to ensure only Vercel can trigger this
    const cronSecret = process.env.CRON_SECRET;
    if (process.env.NODE_ENV === 'production' && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      logger.warn({ action: 'cron_unauthorized' }, 'Unauthorized cron execution attempt');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    logger.info({ action: 'cron_start', task: 'cleanup_expired_bank_transfer_orders' }, 'Starting scheduled cleanup task');

    // We use the Service Role key here to bypass RLS for administrative tasks
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: expiredBankOrders, error: expiredBankOrdersError } = await (
      supabase.rpc as unknown as (
        fn: 'cancel_expired_bank_transfer_orders',
      ) => Promise<{ data: number | null; error: { message: string } | null }>
    )('cancel_expired_bank_transfer_orders');

    if (expiredBankOrdersError) {
      throw new Error(expiredBankOrdersError.message);
    }

    logger.info(
      {
        action: 'cron_complete',
        task: 'cleanup_expired_bank_transfer_orders',
        expiredBankOrders: expiredBankOrders ?? 0,
      },
      'Scheduled task completed successfully',
    );
    
    return NextResponse.json({ success: true, message: 'Cleanup job completed' });
  } catch (error) {
    logger.error({ action: 'cron_error', error }, 'Cron job failed');
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
