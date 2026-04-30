import Link from 'next/link';
import { ArrowRight, BookOpen, Calendar, Clock, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import styles from './blog.module.css';

type BlogListRow = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  read_time_minutes: number;
  published_at: string;
  cover_image: string | null;
};

export default async function BlogPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug,title,excerpt,category,read_time_minutes,published_at,cover_image')
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  const posts: BlogListRow[] = error || !data ? [] : (data as unknown as BlogListRow[]);

  return (
    <div className={styles.page}>
      <FadeIn direction="down">
        <header className={styles.header}>
          <div className={styles.eyebrow}>
            <BookOpen size={14} /> Blog
          </div>
          <h1 className={styles.title}>Chuyện làn da</h1>
          <p className={styles.subtitle}>
            Kiến thức skincare thuần chay, viết bởi đội ngũ VeganGlow
          </p>
        </header>
      </FadeIn>

      {posts.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '4rem 0' }}>
          Hiện chưa có bài viết nào.
        </p>
      ) : (
        <StaggerContainer className={styles.grid}>
          {posts.map((post) => (
            <StaggerItem key={post.slug} className={styles.article}>
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
                      {new Date(post.published_at).toLocaleDateString('vi-VN')}
                    </span>
                    <span className={styles.metaItem}>
                      <Clock size={12} /> {post.read_time_minutes} phút
                    </span>
                  </div>
                  <h2 className={styles.postTitle}>{post.title}</h2>
                  <p className={styles.excerpt}>{post.excerpt}</p>
                  <span className={styles.readMore}>
                    Đọc tiếp <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}
