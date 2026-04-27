'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Calendar, Clock, Tag } from 'lucide-react';

const POSTS = [
  {
    slug: 'rau-ma-cho-da-mun',
    title: 'Rau má — bí quyết Việt cho làn da mụn',
    excerpt: 'Tại sao rau má (centella asiatica) là thành phần được giới skincare châu Á tin dùng?',
    date: '2026-04-10',
    readTime: '6 phút',
    category: 'Skincare',
  },
  {
    slug: 'tra-xanh-chong-oxy-hoa',
    title: 'Trà xanh và sức mạnh chống oxy hóa',
    excerpt: 'EGCG trong trà xanh giúp da chống lại các gốc tự do như thế nào.',
    date: '2026-04-03',
    readTime: '5 phút',
    category: 'Khoa học da',
  },
  {
    slug: 'lam-sao-de-doc-bang-thanh-phan',
    title: 'Đọc bảng thành phần mỹ phẩm sao cho đúng?',
    excerpt: 'Hướng dẫn người dùng phổ thông cách nhận biết thành phần an toàn và rủi ro.',
    date: '2026-03-20',
    readTime: '7 phút',
    category: 'Hướng dẫn',
  },
];

export default function BlogPage() {
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <motion.header
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: '3rem' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#d1fae5', color: '#065f46', padding: '6px 14px', borderRadius: 9999, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
          <BookOpen size={14} /> Blog
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.25rem, 4vw, 3rem)', fontWeight: 800, color: '#1a4d2e', marginBottom: '0.75rem' }}>
          Chuyện làn da
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.05rem' }}>
          Kiến thức skincare thuần chay, viết bởi đội ngũ VeganGlow
        </p>
      </motion.header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {POSTS.map((post, idx) => (
          <motion.article
            key={post.slug}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            whileHover={{ y: -6 }}
          >
            <Link
              href={`/blog/${post.slug}`}
              style={{
                display: 'block',
                background: 'white',
                borderRadius: 16,
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit',
                height: '100%',
                transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 24px 48px rgba(16,185,129,0.10)';
                e.currentTarget.style.borderColor = '#a7f3d0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <div
                style={{
                  height: 160,
                  background: `linear-gradient(135deg, #d1fae5, #6ee7b7)`,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BookOpen size={48} color="#065f46" style={{ opacity: 0.4 }} />
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    background: 'rgba(255,255,255,0.95)',
                    color: '#065f46',
                    padding: '4px 10px',
                    borderRadius: 9999,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Tag size={12} /> {post.category}
                </span>
              </div>
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', color: '#6b7280', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} />
                    {new Date(post.date).toLocaleDateString('vi-VN')}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> {post.readTime}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1a4d2e', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  {post.title}
                </h2>
                <p style={{ color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                  {post.excerpt}
                </p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600, fontSize: '0.88rem' }}>
                  Đọc tiếp <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
