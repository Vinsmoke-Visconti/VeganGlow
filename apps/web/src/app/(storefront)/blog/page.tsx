import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Calendar, Clock, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedWrapper';
import { getStorageUrl } from '@/lib/imageUrl';
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

// Map slugs to local demo images as fallback if not yet uploaded to Supabase
const DEMO_COVERS: Record<string, string> = {
  // New slugs
  'bi-quyet-cham-soc-da-mua-he-2026': '/images/blog/summer.png',
  'niacinamide-thanh-phan-than-ky': '/images/blog/niacinamide.png',
  'huong-dan-doc-bang-thanh-phan-my-pham-cho-nguoi-moi': '/images/blog/ingredients.png',
  // Legacy slugs from seed data
  'rau-ma-cho-da-mun': '/images/blog/summer.png',
  'tra-xanh-chong-oxy-hoa': '/images/blog/niacinamide.png',
  'lam-sao-de-doc-bang-thanh-phan': '/images/blog/ingredients.png',
};

export default async function BlogPage() {
  const supabase = await createClient();

  const { data, error } = await (supabase.from('blog_posts') as any)
    .select('slug,title,excerpt,category,read_time_minutes,published_at,cover_image')
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  const posts: BlogListRow[] = error || !data ? [] : (data as BlogListRow[]);

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
        <p style={{ textAlign: 'center', color: 'var(--color-primary-dark)', padding: '4rem 0', opacity: 0.6, fontWeight: 700 }}>
          Hiện chưa có bài viết nào.
        </p>
      ) : (
        <StaggerContainer className={styles.grid}>
          {posts.map((post) => {
            // Smart fallback logic: Prioritize local demo assets for a stable, high-end look
            const lowerTitle = post.title.toLowerCase();
            const lowerSlug = post.slug.toLowerCase();
            
            let coverSrc = null;

            // 1. Check direct slug match in demo covers
            if (DEMO_COVERS[post.slug]) {
              coverSrc = DEMO_COVERS[post.slug];
            } 
            // 2. Check keywords in title/slug for demo covers
            else if (lowerTitle.includes('mùa hè') || lowerSlug.includes('mua-he')) {
              coverSrc = '/images/blog/summer.png';
            } else if (lowerTitle.includes('niacinamide') || lowerSlug.includes('niacinamide')) {
              coverSrc = '/images/blog/niacinamide.png';
            } else if (lowerTitle.includes('thành phần') || lowerSlug.includes('thanh-phan') || lowerTitle.includes('inci')) {
              coverSrc = '/images/blog/ingredients.png';
            }
            // 3. Last resort: use database path (Supabase Storage)
            else if (post.cover_image) {
              coverSrc = getStorageUrl(post.cover_image);
            }
            
            return (
              <StaggerItem key={post.slug} className={styles.article}>
                <Link href={`/blog/${post.slug}`} className={styles.card}>
                  <div className={styles.imageWrapper}>
                    {coverSrc ? (
                      <Image 
                        src={coverSrc} 
                        alt={post.title} 
                        fill 
                        style={{ objectFit: 'cover' }}
                        className={styles.coverImage}
                      />
                    ) : (
                      <BookOpen size={48} color="white" style={{ opacity: 0.4 }} />
                    )}
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
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}
