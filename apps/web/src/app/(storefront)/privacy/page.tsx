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
          <h2>6. Liên hệ</h2>
          <p>
            Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật này, vui lòng liên hệ với chúng tôi tại:
          </p>
          <p>
            <strong>VeganGlow Support Team</strong><br />
            Email: support@veganglow.vn<br />
            Địa chỉ: Hồ Chí Minh, Việt Nam
          </p>
        </section>
      </div>
    </div>
  );
}
