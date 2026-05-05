'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, Mail, HelpCircle } from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import styles from './faq.module.css';

type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

export default function FaqClient({ faqs }: { faqs: FAQ[] }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('q') ?? '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Open + scroll to a specific FAQ when arriving via `/faq?...#faq-<id>`.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash.startsWith('#faq-')) return;
    const id = hash.slice('#faq-'.length);
    if (faqs.some((f) => f.id === id)) {
      setExpandedId(id);
      // Defer until after layout so the target row exists.
      requestAnimationFrame(() => {
        document.getElementById(`faq-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [faqs]);

  const categories = ['Tất cả', ...Array.from(new Set(faqs.map((f) => f.category)))];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'Tất cả' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <FadeIn direction="down">
          <header className={styles.header}>
            <div className={styles.eyebrow}>
              <HelpCircle size={14} /> Hỗ trợ khách hàng
            </div>
            <h1 className={styles.title}>Chúng tôi có thể giúp gì cho bạn?</h1>
            <p className={styles.subtitle}>
              Tìm câu trả lời nhanh chóng cho các thắc mắc phổ biến về sản phẩm và dịch vụ của VeganGlow.
            </p>

            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Tìm kiếm câu hỏi..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </header>
        </FadeIn>

        <FadeIn direction="up" delay={0.1}>
          <div className={styles.categories}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`${styles.categoryBtn} ${activeCategory === cat ? styles.activeCategory : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </FadeIn>

        <StaggerContainer className={styles.faqGrid}>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => (
              <StaggerItem key={faq.id} className={styles.faqItem}>
                <button
                  id={`faq-${faq.id}`}
                  className={styles.question}
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                >
                  {faq.question}
                  {expandedId === faq.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expandedId === faq.id && (
                  <div className={styles.answer}>
                    <p>{faq.answer}</p>
                  </div>
                )}
              </StaggerItem>
            ))
          ) : (
            <p style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.5, fontWeight: 700, color: 'var(--color-primary-dark)' }}>
              Không tìm thấy kết quả phù hợp.
            </p>
          )}
        </StaggerContainer>

        <FadeIn direction="up" delay={0.3}>
          <section className={styles.ctaSection}>
            <h2 className={styles.ctaTitle}>Vẫn còn thắc mắc?</h2>
            <p className={styles.ctaText}>
              Nếu bạn không tìm thấy câu trả lời, đừng ngần ngại liên hệ với đội ngũ hỗ trợ của chúng tôi.
            </p>
            <Link href="/contact" className={styles.ctaBtn}>
              <Mail size={18} /> Gửi tin nhắn cho chúng tôi
            </Link>
          </section>
        </FadeIn>
      </div>
    </div>
  );
}
