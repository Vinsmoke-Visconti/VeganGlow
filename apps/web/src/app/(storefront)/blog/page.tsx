import Link from 'next/link';

export const metadata = {
  title: 'Blog — VeganGlow',
  description: 'Chuyện làn da, mẹo chăm sóc và xu hướng mỹ phẩm thuần chay.',
};

const POSTS = [
  {
    slug: 'rau-ma-cho-da-mun',
    title: 'Rau má — bí quyết Việt cho làn da mụn',
    excerpt: 'Tại sao rau má (centella asiatica) là thành phần được giới skincare châu Á tin dùng?',
    date: '2026-04-10',
  },
  {
    slug: 'tra-xanh-chong-oxy-hoa',
    title: 'Trà xanh và sức mạnh chống oxy hóa',
    excerpt: 'EGCG trong trà xanh giúp da chống lại các gốc tự do như thế nào.',
    date: '2026-04-03',
  },
  {
    slug: 'lam-sao-de-doc-bang-thanh-phan',
    title: 'Đọc bảng thành phần mỹ phẩm sao cho đúng?',
    excerpt: 'Hướng dẫn người dùng phổ thông cách nhận biết thành phần an toàn và rủi ro.',
    date: '2026-03-20',
  },
];

export default function BlogPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1a4d2e', marginBottom: '0.5rem' }}>
        Chuyện làn da
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2.5rem' }}>
        Kiến thức skincare thuần chay, viết bởi đội ngũ VeganGlow.
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {POSTS.map((post) => (
          <article
            key={post.slug}
            style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
            }}
          >
            <time style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              {new Date(post.date).toLocaleDateString('vi-VN')}
            </time>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a4d2e', margin: '0.5rem 0' }}>
              <Link href={`/blog/${post.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {post.title}
              </Link>
            </h2>
            <p style={{ color: '#4b5563', lineHeight: 1.6 }}>{post.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
