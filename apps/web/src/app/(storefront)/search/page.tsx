import ProductCard, { type ProductCardProduct } from '@/components/products/ProductCard';
import { FadeIn } from '@/components/ui/AnimatedWrapper';
import { createClient } from '@/lib/supabase/server';
import {
  ArrowRight,
  BookOpen,
  Frown,
  HelpCircle,
  Search as SearchIcon,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './search.module.css';

export const revalidate = 0;

type Params = { [key: string]: string | string[] | undefined };

const TRENDING = ['Rau má', 'Trà xanh', 'Serum', 'Kem chống nắng', 'Toner'];

function sanitize(raw: string) {
  return raw
    .replace(/[,()*%\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function stripHtml(value: string, max = 220) {
  const text = value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const rawQuery = typeof params.q === 'string' ? params.q : '';
  const query = sanitize(rawQuery);

  const supabase = await createClient();

  let products: ProductCardProduct[] = [];
  let posts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    lead: string;
    category: string;
    cover_image: string | null;
  }> = [];
  let faqs: Array<{ id: string; question: string; answer: string; category: string }> = [];
  let categories: Array<{ id: string; name: string; slug: string; count: number }> = [];

  if (query.length >= 2) {
    const like = `%${query}%`;

    const [productsRes, postsRes, faqsRes, categoryHits, allActiveProducts, flashSales] =
      await Promise.all([
        supabase
          .from('products')
          .select('*, categories(name, slug), tags(id, name, slug, color, text_color, icon, sort_order)')
          .eq('is_active', true)
          .or(`name.ilike.${like},description.ilike.${like}`)
          .order('rating', { ascending: false })
          .limit(24),
        supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, lead, category, cover_image')
          .eq('is_published', true)
          .or(`title.ilike.${like},excerpt.ilike.${like},lead.ilike.${like}`)
          .order('published_at', { ascending: false })
          .limit(12),
        supabase
          .from('faqs')
          .select('id, question, answer, category')
          .eq('is_visible', true)
          .or(`question.ilike.${like},answer.ilike.${like}`)
          .order('display_order', { ascending: true })
          .limit(12),
        supabase
          .from('categories')
          .select('id, name, slug')
          .ilike('name', like)
          .limit(12),
        supabase.from('products').select('category_id').eq('is_active', true),
        (supabase.from('flash_sales') as any)
          .select('*')
          .eq('status', 'active')
          .lte('starts_at', new Date().toISOString())
          .gte('ends_at', new Date().toISOString()),
      ]);

    const activeFlashSales = (flashSales.data as any[]) ?? [];
    const productRows = ((productsRes.data as any[]) ?? []).map((p) => {
      const flash = activeFlashSales.find((f) => f.product_id === p.id);
      if (flash) {
        return {
          ...p,
          original_price: p.price,
          price: p.price * (1 - flash.discount_percent / 100),
          flash_sale: flash,
        };
      }
      return p;
    });
    products = productRows as ProductCardProduct[];

    posts = ((postsRes.data as any[]) ?? []) as typeof posts;
    faqs = ((faqsRes.data as any[]) ?? []) as typeof faqs;

    const categoryRows = ((categoryHits.data as any[]) ?? []) as Array<{
      id: string;
      name: string;
      slug: string;
    }>;
    const allRows = ((allActiveProducts.data as any[]) ?? []) as Array<{
      category_id: string | null;
    }>;
    categories = categoryRows.map((c) => ({
      ...c,
      count: allRows.filter((r) => r.category_id === c.id).length,
    }));
  }

  const totalHits = products.length + posts.length + faqs.length + categories.length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <form action="/search" method="GET" className={styles.searchBar}>
          <SearchIcon size={22} className={styles.searchIcon} />
          <input
            type="text"
            name="q"
            defaultValue={rawQuery}
            className={styles.searchInput}
            placeholder="Tìm sản phẩm, bài viết, câu hỏi…"
            autoFocus
          />
        </form>

        {query && (
          <div className={styles.queryInfo}>
            <h1 className={styles.queryTitle}>Kết quả cho &ldquo;{query}&rdquo;</h1>
            <p className={styles.resultCount}>
              Tìm thấy <span>{totalHits}</span> nội dung phù hợp
            </p>
          </div>
        )}
      </header>

      {!query ? (
        <FadeIn>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <SearchIcon size={40} />
            </div>
            <h3 className={styles.emptyTitle}>Bạn đang tìm điều gì?</h3>
            <p className={styles.emptyText}>
              Nhập từ khóa để tìm sản phẩm, bài cẩm nang làm đẹp, câu hỏi hỗ trợ hoặc danh mục.
            </p>
            <span className={styles.suggestionTitle}>Gợi ý phổ biến</span>
            <div className={styles.suggestions}>
              {TRENDING.map((s) => (
                <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className={styles.suggestionLink}>
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </FadeIn>
      ) : totalHits === 0 ? (
        <FadeIn>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Frown size={40} />
            </div>
            <h3 className={styles.emptyTitle}>Rất tiếc, không tìm thấy kết quả</h3>
            <p className={styles.emptyText}>
              Chúng tôi không tìm thấy nội dung nào khớp với &ldquo;{query}&rdquo;. Hãy thử với từ
              khóa khác.
            </p>
            <span className={styles.suggestionTitle}>Gợi ý cho bạn</span>
            <div className={styles.suggestions}>
              {TRENDING.map((s) => (
                <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className={styles.suggestionLink}>
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </FadeIn>
      ) : (
        <div className={styles.sections}>
          {products.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <ShoppingBag size={20} /> Sản phẩm
                  <span className={styles.sectionCount}>{products.length}</span>
                </h2>
                <Link href={`/products?q=${encodeURIComponent(query)}`} className={styles.sectionMore}>
                  Xem tất cả <ArrowRight size={14} />
                </Link>
              </div>
              <div className={styles.grid}>
                {products.slice(0, 8).map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 4} />
                ))}
              </div>
            </section>
          )}

          {categories.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <Tag size={20} /> Danh mục
                  <span className={styles.sectionCount}>{categories.length}</span>
                </h2>
              </div>
              <div className={styles.categoryGrid}>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/products?category=${c.slug}`}
                    className={styles.categoryCard}
                  >
                    <div className={styles.categoryName}>{c.name}</div>
                    <div className={styles.categoryMeta}>
                      {c.count} sản phẩm <ArrowRight size={14} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {posts.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <BookOpen size={20} /> Cẩm nang
                  <span className={styles.sectionCount}>{posts.length}</span>
                </h2>
                <Link href="/blog" className={styles.sectionMore}>
                  Tất cả bài viết <ArrowRight size={14} />
                </Link>
              </div>
              <div className={styles.postsGrid}>
                {posts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className={styles.postCard}>
                    {post.cover_image ? (
                      <div className={styles.postCover}>
                        <Image
                          src={post.cover_image}
                          alt={post.title}
                          width={420}
                          height={220}
                          className={styles.postCoverImg}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className={styles.postCoverFallback}>
                        <BookOpen size={32} />
                      </div>
                    )}
                    <div className={styles.postBody}>
                      {post.category && (
                        <span className={styles.postCategory}>{post.category}</span>
                      )}
                      <h3 className={styles.postTitle}>{post.title}</h3>
                      <p className={styles.postExcerpt}>
                        {stripHtml(post.excerpt || post.lead || '')}
                      </p>
                      <span className={styles.postLink}>
                        Đọc bài <ArrowRight size={14} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {faqs.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <HelpCircle size={20} /> Câu hỏi thường gặp
                  <span className={styles.sectionCount}>{faqs.length}</span>
                </h2>
                <Link href="/faq" className={styles.sectionMore}>
                  Trung tâm hỗ trợ <ArrowRight size={14} />
                </Link>
              </div>
              <div className={styles.faqList}>
                {faqs.map((faq) => (
                  <Link
                    key={faq.id}
                    href={`/faq?q=${encodeURIComponent(query)}#faq-${faq.id}`}
                    className={styles.faqItem}
                  >
                    <div className={styles.faqIcon}>
                      <HelpCircle size={20} />
                    </div>
                    <div className={styles.faqBody}>
                      {faq.category && <span className={styles.faqCategory}>{faq.category}</span>}
                      <div className={styles.faqQuestion}>{faq.question}</div>
                      <p className={styles.faqAnswer}>{stripHtml(faq.answer)}</p>
                    </div>
                    <ArrowRight className={styles.faqArrow} size={18} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
