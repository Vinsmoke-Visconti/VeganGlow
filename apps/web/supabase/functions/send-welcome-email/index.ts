/// <reference path="../deno_types.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  try {
    const { email, name } = await req.json();

    console.log(`Sending welcome email to ${email}`);

    const siteUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://veganglow.vn";

    const { data, error } = await resend.emails.send({
      from: "VeganGlow <onboarding@resend.dev>",
      to: [email],
      subject: "Chào mừng bạn đến với VeganGlow!",
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #065e46; padding: 40px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 800;">Chào mừng bạn!</h1>
            <p style="margin-top: 10px; opacity: 0.9; font-size: 16px;">Gia nhập cộng đồng VeganGlow</p>
          </div>
          
          <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
            <p style="font-size: 16px; margin-top: 0; margin-bottom: 24px;">Xin chào <strong>${name || 'bạn'}</strong>,</p>
            <p style="font-size: 15px; color: #475569;">Cảm ơn bạn đã tin tưởng và lựa chọn VeganGlow - Mỹ phẩm thuần chay từ thiên nhiên.</p>
            <p style="font-size: 15px; color: #475569;">Tài khoản của bạn đã được thiết lập thành công. Giờ đây bạn có thể bắt đầu mua sắm và nhận được nhiều ưu đãi đặc quyền dành riêng cho thành viên của chúng tôi.</p>
            
            <div style="margin: 40px 0; text-align: center;">
              <a href="${siteUrl}" style="background-color: #065e46; color: white; padding: 14px 32px; text-decoration: none; border-radius: 99px; font-weight: 700; font-size: 15px; display: inline-block;">Khám phá ngay</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
            <p style="font-size: 14px; color: #64748b; margin: 0;">Trân trọng,<br>Đội ngũ VeganGlow</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">© 2026 VeganGlow. All rights reserved.</p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Email sent successfully", data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
