'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Calendar, Clock, Tag } from 'lucide-react';
import styles from './blog.module.css';

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
    <div className={styles.page}>
      <motion.header
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.header}
      >
        <div className={styles.eyebrow}>
          <BookOpen size={14} /> Blog
        </div>
        <h1 className={styles.title}>
          Chuyện làn da
        </h1>
        <p className={styles.subtitle}>
          Kiến thức skincare thuần chay, viết bởi đội ngũ VeganGlow
        </p>
      </motion.header>

      <div className={styles.grid}>
        {POSTS.map((post, idx) => (
          <motion.article
            key={post.slug}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ delay: idx * 0.1, duration: 0.5 }}
            className={styles.article}
          >
            <Link href={`/blog/${post.slug}`} className={styles.card}>
              <div className={styles.imageWrapper}>
                <BookOpen size={48} color="white" style={{ opacity: 0.4 }} />
                <span className={styles.categoryTag}>
                  <Tag size={12} /> {post.category}
                </span>
              </div>
              <div className={styles.content}>
                <div className={styles.meta}>
                  <span className={styles.metaItem}>
                    <Calendar size={12} />
                    {new Date(post.date).toLocaleDateString('vi-VN')}
                  </span>
                  <span className={styles.metaItem}>
                    <Clock size={12} /> {post.readTime}
                  </span>
                </div>
                <h2 className={styles.postTitle}>
                  {post.title}
                </h2>
                <p className={styles.excerpt}>
                  {post.excerpt}
                </p>
                <span className={styles.readMore}>
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
