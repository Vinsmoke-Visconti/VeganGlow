import React from 'react';
import styles from '../privacy/privacy.module.css'; // Reusing styles for consistency

export const metadata = {
  title: 'Điều khoản Dịch vụ | VeganGlow',
  description: 'Điều khoản dịch vụ và điều kiện mua hàng tại VeganGlow.',
};

export default function TermsOfServicePage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Điều khoản Dịch vụ</h1>
        <p className={styles.lastUpdated}>Cập nhật lần cuối: 10 tháng 05, 2026</p>

        <section className={styles.section}>
          <h2>1. Chấp nhận điều khoản</h2>
          <p>
            Bằng việc truy cập và sử dụng website VeganGlow, bạn đồng ý tuân thủ và bị ràng buộc bởi các điều khoản và điều kiện dịch vụ này. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng ngừng sử dụng dịch vụ của chúng tôi.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Tài khoản người dùng</h2>
          <p>
            Khi tạo tài khoản, bạn có trách nhiệm bảo mật mật khẩu và thông tin tài khoản của mình. Bạn đồng ý chịu trách nhiệm cho tất cả các hoạt động xảy ra dưới tài khoản của bạn.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Chính sách đơn hàng và Thanh toán</h2>
          <p>
            Tất cả đơn hàng đặt trên VeganGlow đều phụ thuộc vào sự chấp nhận và tình trạng sẵn có của sản phẩm. Chúng tôi hỗ trợ các phương thức thanh toán: COD, Chuyển khoản ngân hàng và PayOS. Giá sản phẩm đã bao gồm VAT (nếu có) nhưng chưa bao gồm phí vận chuyển trừ khi có thông báo khác.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Chính sách Giao hàng và Đổi trả</h2>
          <p>
            Chúng tôi sẽ giao hàng theo thông tin địa chỉ bạn cung cấp. Bạn có quyền yêu cầu đổi trả sản phẩm trong vòng 7 ngày kể từ ngày nhận hàng nếu sản phẩm có lỗi từ nhà sản xuất hoặc bị hư hỏng trong quá trình vận chuyển, với điều kiện sản phẩm còn nguyên tem mác và chưa qua sử dụng.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Quyền sở hữu trí tuệ</h2>
          <p>
            Toàn bộ nội dung trên website bao gồm văn bản, hình ảnh, logo, và mã nguồn đều thuộc sở hữu của VeganGlow. Bạn không được sao chép hoặc sử dụng cho mục đích thương mại khi chưa có sự đồng ý bằng văn bản của chúng tôi.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Thay đổi điều khoản</h2>
          <p>
            VeganGlow có quyền thay đổi các điều khoản này bất kỳ lúc nào mà không cần thông báo trước. Các thay đổi sẽ có hiệu lực ngay khi được đăng tải trên website.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Thông tin liên hệ</h2>
          <p>
            Mọi thắc mắc về Điều khoản dịch vụ, vui lòng liên hệ:
          </p>
          <p>
            <strong>VeganGlow Management</strong><br />
            Email: legal@veganglow.vn<br />
            Hồ Chí Minh, Việt Nam
          </p>
        </section>
      </div>
    </div>
  );
}
