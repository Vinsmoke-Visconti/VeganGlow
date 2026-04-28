'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown, HelpCircle, Search, MessageCircle } from 'lucide-react';
import styles from './faq.module.css';

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
    <div className={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.header}
      >
        <div className={styles.eyebrow}>
          <HelpCircle size={14} /> Trợ giúp
        </div>
        <h1 className={styles.title}>
          Câu hỏi thường gặp
        </h1>
        <p className={styles.subtitle}>
          Mọi điều bạn cần biết về VeganGlow — gói gọn ở một nơi.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className={styles.searchContainer}
      >
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm câu hỏi..."
          className={styles.searchInput}
        />
      </motion.div>

      {filtered.length === 0 ? (
        <p className={styles.noResults}>
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
            className={styles.section}
          >
            <h2 className={styles.sectionTitle}>
              {group.title}
            </h2>
            <div className={styles.accordionList}>
              {group.items.map((item, ii) => {
                const key = `${gi}-${ii}`;
                const open = openKey === key;
                return (
                  <div
                    key={key}
                    className={`${styles.accordionItem} ${open ? styles.accordionItemActive : ''}`}
                  >
                    <button
                      onClick={() => setOpenKey(open ? null : key)}
                      className={styles.accordionTrigger}
                    >
                      {item.q}
                      <motion.span
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className={styles.accordionIcon}
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
                          className={styles.contentWrapper}
                        >
                          <div className={styles.content}>
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
        className={styles.cta}
      >
        <div className={styles.ctaIcon}>
          <MessageCircle size={32} />
        </div>
        <h3 className={styles.ctaTitle}>Vẫn còn thắc mắc?</h3>
        <p className={styles.ctaText}>
          Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng trả lời.
        </p>
        <Link
          href="/contact"
          className={styles.contactBtn}
        >
          Liên hệ với chúng tôi
        </Link>
      </motion.div>
    </div>
  );
}
