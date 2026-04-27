'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown, HelpCircle, Search, MessageCircle } from 'lucide-react';

type FaqItem = { q: string; a: string };
type FaqGroup = { title: string; items: FaqItem[] };

const FAQ: FaqGroup[] = [
  {
    title: 'Đơn hàng & Vận chuyển',
    items: [
      { q: 'Thời gian giao hàng là bao lâu?', a: 'Đơn nội thành TP.HCM giao trong 24h, các tỉnh thành khác 2–4 ngày làm việc tùy khu vực.' },
      { q: 'Tôi có thể theo dõi đơn hàng ở đâu?', a: 'Sau khi đăng nhập, vào mục "Lịch sử đơn hàng" để theo dõi trạng thái đơn hàng theo thời gian thực.' },
      { q: 'Phí giao hàng tính như thế nào?', a: 'Hiện tại VeganGlow miễn phí giao hàng cho mọi đơn hàng trên toàn quốc.' },
      { q: 'Tôi có thể đổi/trả sản phẩm không?', a: 'Sản phẩm còn nguyên seal, chưa sử dụng, được đổi trả trong vòng 7 ngày kể từ khi nhận hàng.' },
    ],
  },
  {
    title: 'Sản phẩm & Thành phần',
    items: [
      { q: 'Sản phẩm VeganGlow có thực sự thuần chay không?', a: 'Có. 100% nguyên liệu có nguồn gốc thực vật, không chứa thành phần từ động vật và không thử nghiệm trên động vật.' },
      { q: 'Sản phẩm phù hợp với da nhạy cảm?', a: 'Tất cả sản phẩm đều được kiểm nghiệm da liễu, không paraben, không sulfate, an toàn cho da nhạy cảm.' },
      { q: 'Hạn sử dụng của sản phẩm là bao lâu?', a: '36 tháng kể từ ngày sản xuất khi chưa mở seal, 12 tháng sau khi mở seal.' },
    ],
  },
  {
    title: 'Tài khoản & Thanh toán',
    items: [
      { q: 'Làm sao để tạo tài khoản?', a: 'Bấm "Đăng ký" ở góc phải hoặc đăng nhập bằng Google chỉ với 1 click.' },
      { q: 'VeganGlow chấp nhận hình thức thanh toán nào?', a: 'COD (thanh toán khi nhận hàng) và chuyển khoản ngân hàng. Sắp tới sẽ có thêm ví điện tử.' },
      { q: 'Tôi quên mật khẩu, phải làm sao?', a: 'Bấm "Quên mật khẩu" ở trang đăng nhập để nhận link đặt lại qua email.' },
    ],
  },
];

export default function FaqPage() {
  const [search, setSearch] = useState('');
  const [openKey, setOpenKey] = useState<string | null>('0-0');

  const filtered = FAQ.map((group) => ({
    ...group,
    items: group.items.filter(
      (i) =>
        i.q.toLowerCase().includes(search.toLowerCase()) ||
        i.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: '2.5rem' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#d1fae5', color: '#065f46', padding: '6px 14px', borderRadius: 9999, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
          <HelpCircle size={14} /> Trợ giúp
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.25rem, 4vw, 3rem)', fontWeight: 800, color: '#1a4d2e', marginBottom: '0.75rem' }}>
          Câu hỏi thường gặp
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.05rem' }}>
          Mọi điều bạn cần biết về VeganGlow — gói gọn ở một nơi.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{ position: 'relative', marginBottom: '2.5rem' }}
      >
        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm câu hỏi..."
          style={{
            width: '100%',
            padding: '0.9rem 1rem 0.9rem 2.75rem',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            outline: 'none',
            fontSize: '0.95rem',
            background: 'white',
          }}
        />
      </motion.div>

      {filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem 0' }}>
          Không tìm thấy câu hỏi nào khớp với &ldquo;{search}&rdquo;.
        </p>
      ) : (
        filtered.map((group, gi) => (
          <motion.section
            key={group.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ delay: gi * 0.08, duration: 0.4 }}
            style={{ marginBottom: '2rem' }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a4d2e', marginBottom: '1rem' }}>
              {group.title}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {group.items.map((item, ii) => {
                const key = `${gi}-${ii}`;
                const open = openKey === key;
                return (
                  <div
                    key={key}
                    style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      overflow: 'hidden',
                      transition: 'border-color 0.25s ease',
                      borderColor: open ? '#a7f3d0' : '#e5e7eb',
                    }}
                  >
                    <button
                      onClick={() => setOpenKey(open ? null : key)}
                      style={{
                        width: '100%',
                        padding: '1rem 1.25rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#1f2937',
                        fontSize: '0.98rem',
                      }}
                    >
                      {item.q}
                      <motion.span
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ display: 'inline-flex', color: '#10b981' }}
                      >
                        <ChevronDown size={20} />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ padding: '0 1.25rem 1.1rem', color: '#4b5563', lineHeight: 1.7, fontSize: '0.92rem' }}>
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.section>
        ))
      )}

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        style={{ marginTop: '3rem', textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #f0fdf4, #d1fae5)', borderRadius: 16 }}
      >
        <MessageCircle size={32} color="#065f46" style={{ margin: '0 auto 0.75rem' }} />
        <h3 style={{ color: '#1a4d2e', fontWeight: 700, marginBottom: '0.5rem' }}>Vẫn còn thắc mắc?</h3>
        <p style={{ color: '#4b5563', marginBottom: '1.25rem' }}>
          Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng trả lời.
        </p>
        <Link
          href="/contact"
          style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }}
        >
          Liên hệ với chúng tôi
        </Link>
      </motion.div>
    </div>
  );
}
