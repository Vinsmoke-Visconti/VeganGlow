// Edge Function: Send Email — Transactional email via Gmail SMTP
// POST /functions/v1/send-email
// Body: { to, subject, html }

import { corsHeaders } from '../_shared/cors.ts';
import nodemailer from 'npm:nodemailer';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = await req.json();

    // Cấu hình nodemailer sử dụng Gmail SMTP / Google Cloud OAuth2
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: Deno.env.get('GMAIL_CLIENT_ID') ? {
        type: 'OAuth2',
        user: Deno.env.get('GMAIL_USER'),
        clientId: Deno.env.get('GMAIL_CLIENT_ID'),
        clientSecret: Deno.env.get('GMAIL_CLIENT_SECRET'),
        refreshToken: Deno.env.get('GMAIL_REFRESH_TOKEN'),
      } : {
        user: Deno.env.get('GMAIL_USER'), // Email Gmail của dự án
        pass: Deno.env.get('GMAIL_APP_PASSWORD'), // App Password (16 ký tự)
      },
    });

    // Gửi email
    const info = await transporter.sendMail({
      from: `"VeganGlow Team" <${Deno.env.get('GMAIL_USER')}>`,
      to,
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Email error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
