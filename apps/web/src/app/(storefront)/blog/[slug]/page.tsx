'use client';

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Tag, Share2 } from 'lucide-react';

// Demo dataset — match slugs in /blog list page
const POSTS: Record<
  string,
  { title: string; date: string; readTime: string; category: string; lead: string; sections: { heading?: string; content: string }[] }
> = {
  'rau-ma-cho-da-mun': {
    title: 'Rau má — bí quyết Việt cho làn da mụn',
    date: '2026-04-10',
    readTime: '6 phút đọc',
    category: 'Skincare',
    lead: 'Centella asiatica (rau má) là một trong những thành phần được giới skincare châu Á tin dùng. Vì sao? Hãy cùng VeganGlow tìm hiểu cơ chế khoa học đằng sau.',
    sections: [
      {
        heading: 'Rau má có gì đặc biệt?',
        content:
          'Rau má chứa 4 hợp chất triterpenoids — asiaticoside, madecassoside, asiatic acid và madecassic acid — kết hợp tạo nên hoạt chất TECA giúp giảm viêm, tăng tổng hợp collagen và phục hồi tổn thương trên da.',
      },
      {
        heading: 'Vì sao tốt cho da mụn?',
        content:
          'Mụn về bản chất là phản ứng viêm do vi khuẩn P. acnes kết hợp bít tắc lỗ chân lông. Madecassoside giảm cytokine viêm IL-1, IL-6, làm dịu vết sưng đỏ; asiaticoside thúc đẩy lành thương, hạn chế thâm và sẹo lõm.',
      },
      {
        heading: 'Cách sử dụng đúng',
        content:
          'Sau bước làm sạch và toner, dùng vài giọt serum rau má thoa đều lên da. Có thể dùng sáng và tối. Kết hợp với niacinamide để tăng hiệu quả, tránh dùng cùng AHA/BHA nồng độ cao trong cùng routine.',
      },
    ],
  },
  'tra-xanh-chong-oxy-hoa': {
    title: 'Trà xanh và sức mạnh chống oxy hóa',
    date: '2026-04-03',
    readTime: '5 phút đọc',
    category: 'Khoa học da',
    lead: 'EGCG trong trà xanh là một trong những chất chống oxy hóa mạnh nhất thiên nhiên ban tặng — gấp 100 lần vitamin C.',
    sections: [
      {
        heading: 'EGCG là gì?',
        content:
          'Epigallocatechin gallate (EGCG) là catechin chiếm hơn 50% polyphenol trong lá trà xanh. EGCG trung hòa gốc tự do gây stress oxy hóa, ngăn lão hóa da và tổn thương DNA do tia UV.',
      },
      {
        heading: 'Lợi ích thực tế',
        content:
          'Nghiên cứu Journal of Investigative Dermatology cho thấy bôi EGCG giúp giảm sạm nám, tăng độ đàn hồi và làm dịu da kích ứng do nắng. Trong nội thực, một ngày 2 cốc trà xanh giúp kéo dài hiệu quả chống lão hóa.',
      },
    ],
  },
  'lam-sao-de-doc-bang-thanh-phan': {
    title: 'Đọc bảng thành phần mỹ phẩm sao cho đúng?',
    date: '2026-03-20',
    readTime: '7 phút đọc',
    category: 'Hướng dẫn',
    lead: 'Bảng thành phần (INCI) là "lý lịch khai sinh" của mỗi sản phẩm. Học cách đọc nó là bước đầu để trở thành người tiêu dùng thông thái.',
    sections: [
      {
        heading: 'Quy tắc thứ tự',
        content:
          'Thành phần xếp theo nồng độ giảm dần. 5 cái đầu tiên thường chiếm 80% công thức. Nếu thấy "water" ở đầu thì sản phẩm gốc nước, "petrolatum" ở đầu thì gốc dầu.',
      },
      {
        heading: 'Cảnh giác với gì?',
        content:
          'Paraben (methyl-, propyl-) — chất bảo quản gây tranh cãi. Sulfate (SLS, SLES) — gây khô da. Phthalates (DBP, DEHP) — rối loạn nội tiết. Formaldehyde donors như DMDM hydantoin — kích ứng.',
      },
    ],
  },
};

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const post = POSTS[slug];

  if (!post) notFound();

  return (
    <article style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Link
          href="/blog"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600, marginBottom: '1.5rem', textDecoration: 'none' }}
        >
          <ArrowLeft size={18} /> Tất cả bài viết
        </Link>
      </motion.div>

      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        style={{ marginBottom: '2rem' }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 700, marginBottom: '1rem' }}>
          <Tag size={12} /> {post.category}
        </span>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 800, color: '#1a4d2e', lineHeight: 1.2, marginBottom: '1rem' }}>
          {post.title}
        </h1>
        <div style={{ display: 'flex', gap: '1.25rem', color: '#6b7280', fontSize: '0.9rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={14} />
            {new Date(post.date).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} /> {post.readTime}
          </span>
        </div>
      </motion.header>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        style={{
          fontSize: '1.15rem',
          fontStyle: 'italic',
          color: '#4b5563',
          lineHeight: 1.7,
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #f0fdf4, #d1fae5)',
          borderLeft: '4px solid #10b981',
          borderRadius: 8,
          marginBottom: '2.5rem',
        }}
      >
        {post.lead}
      </motion.p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {post.sections.map((section, idx) => (
          <motion.section
            key={idx}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
          >
            {section.heading && (
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a4d2e', marginBottom: '0.75rem' }}>
                {section.heading}
              </h2>
            )}
            <p style={{ color: '#374151', lineHeight: 1.8, fontSize: '1.02rem' }}>{section.content}</p>
          </motion.section>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        style={{ marginTop: '3rem', padding: '1.5rem', background: '#f9fafb', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}
      >
        <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Bài viết hữu ích? Chia sẻ với bạn bè
        </div>
        <button
          onClick={() => navigator.share?.({ title: post.title, url: window.location.href }).catch(() => {})}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
        >
          <Share2 size={16} /> Chia sẻ
        </button>
      </motion.div>
    </article>
  );
}
