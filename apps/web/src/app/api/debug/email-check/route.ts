import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * TEMPORARY DEBUG ENDPOINT — remove after verifying email config on production.
 * Tests raw nodemailer sending, bypassing the email.ts wrapper to isolate issues.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== 'vg_debug_2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envCheck = {
    GMAIL_USER: process.env.GMAIL_USER ? process.env.GMAIL_USER.substring(0, 8) + '***' : 'MISSING',
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ? process.env.GMAIL_CLIENT_ID.substring(0, 10) + '***' : 'MISSING',
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? 'SET (len=' + process.env.GMAIL_CLIENT_SECRET.length + ')' : 'MISSING',
    GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN ? 'SET (len=' + process.env.GMAIL_REFRESH_TOKEN.length + ')' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  };

  const testEmail = searchParams.get('to');
  if (!testEmail) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      envCheck,
      hint: 'Add &to=your@email.com to test sending a real email',
    });
  }

  // Create a FRESH transporter (not the cached module-level one)
  let transporterInfo: string = '';
  let sendResult: any = null;

  try {
    const freshTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER || '',
        clientId: process.env.GMAIL_CLIENT_ID || '',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
      },
    });

    // Verify connection first
    try {
      await freshTransporter.verify();
      transporterInfo = 'SMTP connection verified OK';
    } catch (verifyErr: any) {
      transporterInfo = 'SMTP verify FAILED: ' + verifyErr.message;
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        envCheck,
        transporterInfo,
        error: verifyErr.message,
        errorCode: verifyErr.code,
        hint: 'Gmail OAuth2 credentials may be expired or invalid. Check GMAIL_REFRESH_TOKEN.',
      });
    }

    // Try sending
    const info = await freshTransporter.sendMail({
      from: `"VeganGlow Debug" <${process.env.GMAIL_USER}>`,
      to: testEmail,
      subject: '🧪 VeganGlow Email Test - ' + new Date().toISOString(),
      html: '<div style="font-family:sans-serif;padding:20px;"><h2>Email Test Successful!</h2><p>This email was sent from Vercel production to verify the email system works.</p><p>Time: ' + new Date().toISOString() + '</p></div>',
    });

    sendResult = {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    };
  } catch (err: any) {
    sendResult = {
      success: false,
      error: err.message,
      code: err.code,
      command: err.command,
      responseCode: err.responseCode,
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    envCheck,
    transporterInfo,
    sendResult,
  });
}
