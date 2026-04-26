export const metadata = {
  title: 'Về chúng tôi — VeganGlow',
  description: 'Câu chuyện đằng sau VeganGlow — mỹ phẩm thuần chay từ thiên nhiên Việt.',
};

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 1.5rem', lineHeight: 1.7, color: '#1f2937' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1a4d2e', marginBottom: '1.5rem' }}>
        Câu chuyện VeganGlow
      </h1>
      <p style={{ fontSize: '1.125rem', color: '#4b5563', marginBottom: '2rem' }}>
        VeganGlow ra đời với sứ mệnh mang đến mỹ phẩm thuần chay an toàn,
        thân thiện với môi trường và phù hợp với làn da người Việt.
      </p>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a4d2e', marginTop: '2rem', marginBottom: '1rem' }}>
        Giá trị cốt lõi
      </h2>
      <ul style={{ paddingLeft: '1.5rem' }}>
        <li><strong>100% thuần chay</strong> — không thử nghiệm trên động vật.</li>
        <li><strong>Nguyên liệu tự nhiên</strong> — chiết xuất từ thực vật bản địa.</li>
        <li><strong>Bao bì thân thiện</strong> — vật liệu tái chế, giảm rác thải.</li>
        <li><strong>Minh bạch</strong> — công khai bảng thành phần đầy đủ.</li>
      </ul>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a4d2e', marginTop: '2rem', marginBottom: '1rem' }}>
        Đội ngũ
      </h2>
      <p>
        Chúng tôi là nhóm các chuyên gia da liễu, kỹ sư hóa mỹ phẩm và những
        người yêu thiên nhiên — cùng chung một niềm tin: làn da khỏe mạnh
        bắt đầu từ những gì thuần khiết nhất.
      </p>
    </div>
  );
}
