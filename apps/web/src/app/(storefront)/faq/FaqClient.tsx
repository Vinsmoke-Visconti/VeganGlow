'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown, HelpCircle, Search, MessageCircle } from 'lucide-react';
import styles from './faq.module.css';

export type FaqItem = { id: string; question: string; answer: string };
export type FaqGroup = { title: string; items: FaqItem[] };

const FALLBACK: FaqGroup[] = [];

export default function FaqClient({ groups }: { groups: FaqGroup[] }) {
  const [search, setSearch] = useState('');
  const [openKey, setOpenKey] = useState<string | null>('0-0');

  const data = groups.length > 0 ? groups : FALLBACK;
  const term = search.toLowerCase();

  const filtered = data
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (i) => i.question.toLowerCase().includes(term) || i.answer.toLowerCase().includes(term)
      ),
    }))
    .filter((g) => g.items.length > 0);

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
        <h1 className={styles.title}>Câu hỏi thường gặp</h1>
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

      {data.length === 0 ? (
        <p className={styles.noResults}>Hiện chưa có câu hỏi nào.</p>
      ) : filtered.length === 0 ? (
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
            <h2 className={styles.sectionTitle}>{group.title}</h2>
            <div className={styles.accordionList}>
              {group.items.map((item, ii) => {
                const key = `${gi}-${ii}`;
                const open = openKey === key;
                return (
                  <div
                    key={item.id}
                    className={`${styles.accordionItem} ${open ? styles.accordionItemActive : ''}`}
                  >
                    <button
                      onClick={() => setOpenKey(open ? null : key)}
                      className={styles.accordionTrigger}
                    >
                      {item.question}
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
                          <div className={styles.content}>{item.answer}</div>
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
        <p className={styles.ctaText}>Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng trả lời.</p>
        <Link href="/contact" className={styles.contactBtn}>
          Liên hệ với chúng tôi
        </Link>
      </motion.div>
    </div>
  );
}
