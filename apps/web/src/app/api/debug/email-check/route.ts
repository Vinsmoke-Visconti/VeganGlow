import { NextRequest, NextResponse } from 'next/server';

/**
 * TEMPORARY DEBUG ENDPOINT — remove after verifying email config on production.
 * GET /api/debug/email-check?secret=vg_debug_2026
 *
 * Returns which Gmail env vars are present (not their values) and attempts
 * a test send to confirm the OAuth2 transport is functional.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== 'vg_debug_2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envCheck = {
    GMAIL_USER: !!process.env.GMAIL_USER,
    GMAIL_USER_preview: process.env.GMAIL_USER ? process.env.GMAIL_USER.substring(0, 5) + '***' : 'MISSING',
    GMAIL_CLIENT_ID: !!process.env.GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET: !!process.env.GMAIL_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN: !!process.env.GMAIL_REFRESH_TOKEN,
    GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  };

  // Try to actually send a test email
  let emailResult: { success: boolean; messageId?: string; error?: string } = {
    success: false,
    error: 'Not attempted',
  };

  const testEmail = searchParams.get('to');
  if (testEmail) {
    try {
      const { sendWelcomeEmail } = await import('@/lib/email');
      const result = await sendWelcomeEmail(testEmail, 'Debug Test');
      emailResult = {
        success: true,
        messageId: result?.id || 'unknown',
      };
    } catch (err: any) {
      emailResult = {
        success: false,
        error: err.message || String(err),
      };
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    envCheck,
    emailResult,
    hint: emailResult.messageId?.startsWith('mock-')
      ? 'EMAIL IS MOCKED! Gmail credentials are missing or invalid on this deployment.'
      : emailResult.success
        ? 'Email sent successfully via Gmail OAuth2!'
        : 'Add &to=your@email.com to test sending',
  });
}
