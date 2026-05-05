'use client';

import { createBrowserClient } from '@/lib/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  HelpCircle,
  Loader2,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  TrendingUp,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeProductImage } from '@/lib/imageUrl';
import styles from './SearchModal.module.css';

type ProductHit = {
  kind: 'product';
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  categoryName: string | null;
};
type PostHit = {
  kind: 'post';
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  cover: string | null;
};
type FaqHit = {
  kind: 'faq';
  id: string;
  question: string;
  answer: string;
  category: string;
};
type CategoryHit = {
  kind: 'category';
  id: string;
  name: string;
  slug: string;
};

type Hits = {
  products: ProductHit[];
  posts: PostHit[];
  faqs: FaqHit[];
  categories: CategoryHit[];
};

const EMPTY_HITS: Hits = { products: [], posts: [], faqs: [], categories: [] };

const TRENDING_SEARCHES = ['Serum Rau Má', 'Kem chống nắng', 'Toner Diếp Cá', 'Mặt nạ hoa hồng'];

function sanitize(query: string) {
  return query.replace(/[,()*%\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function stripHtml(input: string, max = 140) {
  const text = input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hits>(EMPTY_HITS);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      setQuery('');
      setHits(EMPTY_HITS);
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits(EMPTY_HITS);
      return;
    }
    const safe = sanitize(trimmed);
    if (!safe) {
      setHits(EMPTY_HITS);
      return;
    }

    let cancelled = false;
    const debounce = setTimeout(async () => {
      setLoading(true);
      try {
        const like = `%${safe}%`;

        const [productsRes, postsRes, faqsRes, categoriesRes] = await Promise.all([
          supabase
            .from('products')
            .select('id, name, slug, price, image, categories:category_id(name)')
            .eq('is_active', true)
            .or(`name.ilike.${like},description.ilike.${like}`)
            .limit(4),
          supabase
            .from('blog_posts')
            .select('id, title, slug, excerpt, lead, category, cover_image')
            .eq('is_published', true)
            .or(`title.ilike.${like},excerpt.ilike.${like},lead.ilike.${like}`)
            .order('published_at', { ascending: false })
            .limit(4),
          supabase
            .from('faqs')
            .select('id, question, answer, category')
            .eq('is_visible', true)
            .or(`question.ilike.${like},answer.ilike.${like}`)
            .limit(4),
          supabase
            .from('categories')
            .select('id, name, slug')
            .ilike('name', like)
            .limit(4),
        ]);

        if (cancelled) return;

        const productHits: ProductHit[] = ((productsRes.data as any[]) ?? []).map((p) => ({
          kind: 'product',
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          image: p.image ?? null,
          categoryName: p.categories?.name ?? null,
        }));
        const postHits: PostHit[] = ((postsRes.data as any[]) ?? []).map((p) => ({
          kind: 'post',
          id: p.id,
          title: p.title,
          slug: p.slug,
          excerpt: stripHtml(p.excerpt || p.lead || ''),
          category: p.category || '',
          cover: p.cover_image ?? null,
        }));
        const faqHits: FaqHit[] = ((faqsRes.data as any[]) ?? []).map((f) => ({
          kind: 'faq',
          id: f.id,
          question: f.question,
          answer: stripHtml(f.answer || ''),
          category: f.category || '',
        }));
        const categoryHits: CategoryHit[] = ((categoriesRes.data as any[]) ?? []).map((c) => ({
          kind: 'category',
          id: c.id,
          name: c.name,
          slug: c.slug,
        }));

        setHits({
          products: productHits,
          posts: postHits,
          faqs: faqHits,
          categories: categoryHits,
        });
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [query, supabase]);

  const totalHits =
    hits.products.length + hits.posts.length + hits.faqs.length + hits.categories.length;

  const goSearchAll = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goSearchAll();
  };

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.container}>
              <header className={styles.header}>
                <form onSubmit={handleSubmit} className={styles.searchBox}>
                  <Search className={styles.searchIcon} size={24} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Tìm sản phẩm, bài viết, câu hỏi…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={styles.input}
                  />
                  {loading ? (
                    <Loader2 className={styles.spinner} size={20} />
                  ) : query ? (
                    <button type="button" onClick={() => setQuery('')} className={styles.clearBtn}>
                      <X size={20} />
                    </button>
                  ) : null}
                </form>
                <button onClick={onClose} className={styles.closeBtn}>
                  Đóng <X size={20} />
                </button>
              </header>

              <main className={styles.content}>
                {query.trim().length < 2 ? (
                  <div className={styles.suggestions}>
                    <div className={styles.suggestionGroup}>
                      <h3 className={styles.groupTitle}>
                        <TrendingUp size={16} /> Xu hướng tìm kiếm
                      </h3>
                      <div className={styles.trendingList}>
                        {TRENDING_SEARCHES.map((term) => (
                          <button
                            key={term}
                            onClick={() => setQuery(term)}
                            className={styles.trendingItem}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.suggestionGroup}>
                      <h3 className={styles.groupTitle}>
                        <Sparkles size={16} /> Gợi ý cho bạn
                      </h3>
                      <p className={styles.hintText}>
                        Hãy thử &quot;Rau Má&quot;, &quot;Trà Xanh&quot; hoặc tên một câu hỏi hỗ trợ
                        để khám phá toàn bộ nội dung VeganGlow.
                      </p>
                    </div>
                  </div>
                ) : totalHits === 0 && !loading ? (
                  <div className={styles.noResults}>
                    <div className={styles.noResultsIcon}>
                      <Search size={48} />
                    </div>
                    <p>
                      Không tìm thấy nội dung nào khớp với &quot;<strong>{query}</strong>&quot;
                    </p>
                    <span>Hãy thử từ khóa khác hoặc kiểm tra lại chính tả.</span>
                  </div>
                ) : (
                  <div className={styles.results}>
                    {hits.products.length > 0 && (
                      <section className={styles.suggestionGroup}>
                        <h3 className={styles.groupTitle}>
                          <ShoppingBag size={16} /> Sản phẩm ({hits.products.length})
                        </h3>
                        <div className={styles.resultsList}>
                          {hits.products.map((p) => (
                            <button
                              key={p.id}
                              className={styles.resultItem}
                              onClick={() => navigate(`/products/${p.slug}`)}
                            >
                              <div className={styles.productImg}>
                                <Image
                                  src={normalizeProductImage(p.image) || '/images/placeholder.jpg'}
                                  alt={p.name}
                                  width={60}
                                  height={60}
                                  className={styles.img}
                                  unoptimized
                                />
                              </div>
                              <div className={styles.productInfo}>
                                <div className={styles.productCategory}>
                                  {p.categoryName || 'Chăm sóc da'}
                                </div>
                                <div className={styles.productName}>{p.name}</div>
                                <div className={styles.productPrice}>{formatVnd(p.price)}</div>
                              </div>
                              <ArrowRight className={styles.resultArrow} size={18} />
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    {hits.posts.length > 0 && (
                      <section className={styles.suggestionGroup}>
                        <h3 className={styles.groupTitle}>
                          <BookOpen size={16} /> Cẩm nang ({hits.posts.length})
                        </h3>
                        <div className={styles.resultsList}>
                          {hits.posts.map((p) => (
                            <button
                              key={p.id}
                              className={styles.resultItem}
                              onClick={() => navigate(`/blog/${p.slug}`)}
                            >
                              <div className={styles.productImg}>
                                {p.cover ? (
                                  <Image
                                    src={p.cover}
                                    alt={p.title}
                                    width={60}
                                    height={60}
                                    className={styles.img}
                                    unoptimized
                                  />
                                ) : (
                                  <div className={styles.iconAvatar}>
                                    <BookOpen size={22} />
                                  </div>
                                )}
                              </div>
                              <div className={styles.productInfo}>
                                <div className={styles.productCategory}>
                                  {p.category || 'Bài viết'}
                                </div>
                                <div className={styles.productName}>{p.title}</div>
                                {p.excerpt && (
                                  <div className={styles.resultSnippet}>{p.excerpt}</div>
                                )}
                              </div>
                              <ArrowRight className={styles.resultArrow} size={18} />
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    {hits.faqs.length > 0 && (
                      <section className={styles.suggestionGroup}>
                        <h3 className={styles.groupTitle}>
                          <HelpCircle size={16} /> Câu hỏi thường gặp ({hits.faqs.length})
                        </h3>
                        <div className={styles.resultsList}>
                          {hits.faqs.map((f) => (
                            <button
                              key={f.id}
                              className={styles.resultItem}
                              onClick={() =>
                                navigate(`/faq?q=${encodeURIComponent(query.trim())}#faq-${f.id}`)
                              }
                            >
                              <div className={styles.productImg}>
                                <div className={styles.iconAvatar}>
                                  <HelpCircle size={22} />
                                </div>
                              </div>
                              <div className={styles.productInfo}>
                                <div className={styles.productCategory}>
                                  {f.category || 'Hỗ trợ'}
                                </div>
                                <div className={styles.productName}>{f.question}</div>
                                {f.answer && (
                                  <div className={styles.resultSnippet}>{f.answer}</div>
                                )}
                              </div>
                              <ArrowRight className={styles.resultArrow} size={18} />
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    {hits.categories.length > 0 && (
                      <section className={styles.suggestionGroup}>
                        <h3 className={styles.groupTitle}>
                          <Tag size={16} /> Danh mục ({hits.categories.length})
                        </h3>
                        <div className={styles.chipList}>
                          {hits.categories.map((c) => (
                            <button
                              key={c.id}
                              className={styles.trendingItem}
                              onClick={() => navigate(`/products?category=${c.slug}`)}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    <button className={styles.viewAllBtn} onClick={goSearchAll}>
                      Xem toàn bộ kết quả cho &quot;{query}&quot;
                    </button>
                  </div>
                )}
              </main>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
