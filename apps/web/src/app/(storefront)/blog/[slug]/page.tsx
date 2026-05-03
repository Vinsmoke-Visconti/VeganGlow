import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { FadeIn } from '@/components/ui/AnimatedWrapper';
import BlogShareButton from './BlogShareButton';

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
    <article style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
      <FadeIn direction="down">
        <Link
          href="/blog"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#10b981',
            fontWeight: 600,
            marginBottom: '1.5rem',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={18} /> Tất cả bài viết
        </Link>
      </FadeIn>

      <FadeIn direction="up" delay={0.05}>
        <header style={{ marginBottom: '2rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: '#d1fae5',
              color: '#065f46',
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
            }}
          >
            <Tag size={12} /> {post.category}
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 800,
              color: '#1a4d2e',
              lineHeight: 1.2,
              marginBottom: '1rem',
            }}
          >
            {post.title}
          </h1>
          <div style={{ display: 'flex', gap: '1.25rem', color: '#6b7280', fontSize: '0.9rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={14} />
              {new Date(post.published_at).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} /> {post.read_time_minutes} phút đọc
            </span>
          </div>
        </header>
      </FadeIn>

      <FadeIn direction="up" delay={0.15}>
        <p
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
        </p>
      </FadeIn>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {sections.map((section, idx) => (
          <FadeIn key={idx} direction="up" delay={idx * 0.05}>
            <section>
              {section.heading && (
                <h2
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: '#1a4d2e',
                    marginBottom: '0.75rem',
                  }}
                >
                  {section.heading}
                </h2>
              )}
              <p style={{ color: '#374151', lineHeight: 1.8, fontSize: '1.02rem' }}>
                {section.content}
              </p>
            </section>
          </FadeIn>
        ))}
      </div>

      <div
        style={{
          marginTop: '3rem',
          padding: '1.5rem',
          background: '#f9fafb',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Bài viết hữu ích? Chia sẻ với bạn bè
        </div>
        <BlogShareButton title={post.title} />
      </div>
    </article>
  );
}
