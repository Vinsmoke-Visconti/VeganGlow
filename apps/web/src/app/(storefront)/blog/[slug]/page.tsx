import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { FadeIn } from '@/components/ui/AnimatedWrapper';
import BlogShareButton from './BlogShareButton';
import styles from './blog-detail.module.css';

type BlogSection = { heading?: string; content: string };

type BlogPostRow = {
  slug: string;
  title: string;
  category: string;
  read_time_minutes: number;
  published_at: string;
  lead: string;
  sections: BlogSection[];
};

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post, error } = await (supabase.from('blog_posts') as any)
    .select('slug,title,category,read_time_minutes,published_at,lead,sections')
    .eq('slug', slug)
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .maybeSingle();

  if (error || !post) notFound();

  const sections: BlogSection[] = Array.isArray(post.sections) ? post.sections : [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <FadeIn direction="down">
          <Link href="/blog" className={styles.backBtn}>
            <ArrowLeft size={18} /> Tất cả bài viết
          </Link>
        </FadeIn>

        <article className={styles.articleCard}>
          <FadeIn direction="up" delay={0.05}>
            <header className={styles.header}>
              <span className={styles.category}>
                <Tag size={12} /> {post.category}
              </span>
              <h1 className={styles.title}>{post.title}</h1>
              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <Calendar size={14} />
                  {new Date(post.published_at).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className={styles.metaItem}>
                  <Clock size={14} /> {post.read_time_minutes} phút đọc
                </span>
              </div>
            </header>
          </FadeIn>

          <FadeIn direction="up" delay={0.15}>
            <p className={styles.lead}>
              {post.lead}
            </p>
          </FadeIn>

          <div className={styles.contentBody}>
            {sections.map((section, idx) => (
              <FadeIn key={idx} direction="up" delay={idx * 0.05}>
                <section>
                  {section.heading && (
                    <h2 className={styles.sectionTitle}>
                      {section.heading}
                    </h2>
                  )}
                  <p className={styles.paragraph}>
                    {section.content}
                  </p>
                </section>
              </FadeIn>
            ))}
          </div>

          <FadeIn direction="up" delay={0.3}>
            <div className={styles.footerActions}>
              <div className={styles.shareText}>
                Bài viết hữu ích? Chia sẻ với bạn bè
              </div>
              <BlogShareButton title={post.title} />
            </div>
          </FadeIn>
        </article>
      </div>
    </div>
  );
}
