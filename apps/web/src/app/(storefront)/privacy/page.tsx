import React from 'react';
import styles from './privacy.module.css';

export const metadata = {
  title: 'Chính sách Bảo mật | VeganGlow',
  description: 'Chính sách bảo mật thông tin khách hàng tại VeganGlow.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Chính sách Bảo mật</h1>
        <p className={styles.lastUpdated}>Cập nhật lần cuối: 10 tháng 05, 2026</p>

        {/* === DEMO DISCLAIMER — IMPORTANT === */}
        <section className={styles.section} style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚠️ Tuyên bố miễn trừ trách nhiệm — Dự án Demo
          </h2>
          <p style={{ color: '#78350f', lineHeight: 1.8 }}>
            <strong>VeganGlow là một dự án demo/học thuật</strong> được xây dựng cho mục đích
            báo cáo cuối kỳ môn Hệ thống Thông tin Quản lý (MIS). Tất cả sản phẩm, hình ảnh,
            thương hiệu và nội dung trên website đều là <strong>ảo, mang tính chất minh họa</strong>,
            không liên quan đến bất kỳ thương hiệu, công ty hoặc sản phẩm thương mại thực tế nào.
          </p>
          <ul style={{ color: '#78350f', lineHeight: 2 }}>
            <li>🛒 <strong>Sản phẩm:</strong> Hoàn toàn là ý tưởng demo, không có sản phẩm thực tế được mua bán.</li>
            <li>💳 <strong>Thanh toán:</strong> Hệ thống thanh toán (PayOS, chuyển khoản) chỉ ở chế độ <strong>sandbox/test</strong>. Không có giao dịch tài chính thực tế nào được thực hiện.</li>
            <li>📦 <strong>Đơn hàng:</strong> Không có hàng hóa nào được giao. Mọi đơn hàng đều là dữ liệu giả lập.</li>
            <li>👤 <strong>Dữ liệu người dùng:</strong> Dữ liệu đăng ký chỉ phục vụ mục đích demo và sẽ được xóa sau khi kết thúc môn học.</li>
            <li>📜 <strong>Pháp lý:</strong> Dự án tuân thủ Luật An ninh mạng Việt Nam (86/2015/QH13) và Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân. Không có hoạt động thương mại thực tế diễn ra.</li>
          </ul>
          <p style={{ color: '#78350f', fontWeight: 600, marginTop: '0.75rem' }}>
            Mọi hình ảnh sản phẩm đều từ nguồn miễn phí (Unsplash) và không vi phạm bản quyền thương mại.
            Dự án không có mục đích kinh doanh hay lợi nhuận.
          </p>
        </section>

        <section className={styles.section}>
          <h2>1. Thu thập thông tin cá nhân</h2>
          <p>
            VeganGlow thu thập thông tin cá nhân của bạn khi bạn đăng ký tài khoản, đặt hàng, hoặc liên hệ với chúng tôi. Các thông tin bao gồm:
          </p>
          <ul>
            <li>Họ và tên</li>
            <li>Địa chỉ email</li>
            <li>Số điện thoại</li>
            <li>Địa chỉ giao hàng</li>
            <li>Thông tin thanh toán (được xử lý an toàn qua đối tác cổng thanh toán)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. Mục đích sử dụng thông tin</h2>
          <p>Chúng tôi sử dụng thông tin thu thập được để:</p>
          <ul>
            <li>Xử lý và giao đơn hàng của bạn.</li>
            <li>Gửi thông báo về tình trạng đơn hàng và hỗ trợ khách hàng.</li>
            <li>Gửi thông tin khuyến mãi và cập nhật sản phẩm (nếu bạn đăng ký).</li>
            <li>Cải thiện trải nghiệm người dùng trên website.</li>
            <li>Ngăn chặn các hoạt động gian lận và đảm bảo an ninh hệ thống.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Bảo mật thông tin</h2>
          <p>
            Chúng tôi cam kết bảo mật thông tin cá nhân của bạn bằng các biện pháp kỹ thuật và tổ chức phù hợp. Dữ liệu của bạn được lưu trữ trên hệ thống máy chủ an toàn của Supabase và được mã hóa khi truyền tải qua giao thức HTTPS.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Chia sẻ thông tin với bên thứ ba</h2>
          <p>
            Chúng tôi không bán, trao đổi hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba. Chúng tôi chỉ chia sẻ thông tin cần thiết với các đối tác dịch vụ tin cậy để thực hiện đơn hàng (ví dụ: đơn vị vận chuyển, cổng thanh toán PayOS).
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Quyền của bạn</h2>
          <p>
            Bạn có quyền truy cập, chỉnh sửa hoặc yêu cầu xóa thông tin cá nhân của mình bất kỳ lúc nào thông qua phần quản lý tài khoản trên website hoặc liên hệ trực tiếp với chúng tôi qua email support@veganglow.vn.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Tuân thủ Pháp luật Việt Nam</h2>
          <p>
            Website VeganGlow hoạt động tuân thủ các quy định pháp luật Việt Nam hiện hành, bao gồm:
          </p>
          <ul>
            <li><strong>Luật An ninh mạng 2018</strong> (Luật số 24/2018/QH14) — Đảm bảo an toàn thông tin trên không gian mạng.</li>
            <li><strong>Nghị định 13/2023/NĐ-CP</strong> — Về bảo vệ dữ liệu cá nhân, quy định quyền và nghĩa vụ của bên xử lý dữ liệu.</li>
            <li><strong>Luật Giao dịch Điện tử 2023</strong> (Luật số 20/2023/QH15) — Về giao dịch điện tử và chữ ký số.</li>
            <li><strong>Nghị định 52/2013/NĐ-CP</strong> (sửa đổi bổ sung) — Về thương mại điện tử.</li>
          </ul>
          <p style={{ marginTop: '1rem', fontStyle: 'italic', opacity: 0.8 }}>
            Lưu ý: Vì đây là dự án demo học thuật, mọi hoạt động trên website không cấu thành hoạt động thương mại thực tế theo quy định tại Điều 3, Luật Thương mại 2005.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Liên hệ</h2>
          <p>
            Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật này, vui lòng liên hệ với chúng tôi tại:
          </p>
          <p>
            <strong>VeganGlow Support Team</strong><br />
            Email: support@veganglow.vn<br />
            Địa chỉ: Hồ Chí Minh, Việt Nam<br />
            <em>(Dự án báo cáo cuối kỳ — Trường Đại học Tôn Đức Thắng)</em>
          </p>
        </section>
      </div>
    </div>
  );
}
