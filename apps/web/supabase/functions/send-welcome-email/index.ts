import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  try {
    const { email, name } = await req.json();

    console.log(`Sending welcome email to ${email}`);

    const { data, error } = await resend.emails.send({
      from: "VeganGlow <onboarding@resend.dev>",
      to: [email],
      subject: "Chào mừng bạn đến với VeganGlow!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #10b981; padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Chào mừng bạn đến với VeganGlow!</h1>
          </div>
          <div style="padding: 40px 30px; color: #1e293b; line-height: 1.6;">
            <p style="font-size: 18px; margin-top: 0;">Chào ${name || 'bạn'},</p>
            <p>Cảm ơn bạn đã tin tưởng và lựa chọn VeganGlow - Mỹ phẩm thuần chay từ thiên nhiên.</p>
            <p>Tài khoản của bạn đã được xác nhận thành công thông qua Google. Giờ đây bạn có thể bắt đầu mua sắm và nhận được nhiều ưu đãi dành riêng cho thành viên.</p>
            <div style="margin: 40px 0; text-align: center;">
              <a href="https://veganglow.vercel.app" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Khám phá ngay</a>
            </div>
            <p style="font-size: 14px; color: #64748b;">Trân trọng,<br>Đội ngũ VeganGlow</p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 VeganGlow. Mọi quyền được bảo lưu.
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
