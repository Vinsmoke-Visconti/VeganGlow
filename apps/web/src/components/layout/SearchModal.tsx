'use client';

import { createBrowserClient } from '@/lib/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Loader2, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './SearchModal.module.css';

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  category: { name: string } | null;
}

const TRENDING_SEARCHES = ['Serum Rau Má', 'Kem chống nắng', 'Toner Diếp Cá', 'Mặt nạ hoa hồng'];

export default function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      setQuery('');
      setResults([]);
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    const searchProducts = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data } = await supabase
          .from('products')
          .select('id, name, slug, price, image_url, category:categories(name)')
          .ilike('name', `%${query}%`)
          .limit(5);
        
        setResults((data as any[]) || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [query, supabase]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  const handleResultClick = (slug: string) => {
    router.push(`/products/${slug}`);
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
                <form onSubmit={handleSearch} className={styles.searchBox}>
                  <Search className={styles.searchIcon} size={24} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Tìm kiếm sản phẩm thuần chay..."
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
                {query.length < 2 ? (
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
                        Hãy thử tìm "Rau Má" hoặc "Trà Xanh" để khám phá các dòng sản phẩm đặc trưng của VeganGlow.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.results}>
                    {results.length > 0 ? (
                      <>
                        <h3 className={styles.groupTitle}>Sản phẩm gợi ý ({results.length})</h3>
                        <div className={styles.resultsList}>
                          {results.map((product) => (
                            <button
                              key={product.id}
                              className={styles.resultItem}
                              onClick={() => handleResultClick(product.slug)}
                            >
                              <div className={styles.productImg}>
                                <Image
                                  src={product.image_url || '/images/placeholder.jpg'}
                                  alt={product.name}
                                  width={60}
                                  height={60}
                                  className={styles.img}
                                />
                              </div>
                              <div className={styles.productInfo}>
                                <div className={styles.productCategory}>
                                  {product.category?.name || 'Chăm sóc da'}
                                </div>
                                <div className={styles.productName}>{product.name}</div>
                                <div className={styles.productPrice}>
                                  {new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND',
                                  }).format(product.price)}
                                </div>
                              </div>
                              <ArrowRight className={styles.resultArrow} size={18} />
                            </button>
                          ))}
                        </div>
                        <button 
                          className={styles.viewAllBtn}
                          onClick={handleSearch}
                        >
                          Xem tất cả kết quả cho "{query}"
                        </button>
                      </>
                    ) : !loading && (
                      <div className={styles.noResults}>
                        <div className={styles.noResultsIcon}>
                          <Search size={48} />
                        </div>
                        <p>Không tìm thấy sản phẩm nào khớp với "<strong>{query}</strong>"</p>
                        <span>Vui lòng thử từ khóa khác hoặc kiểm tra lại chính tả.</span>
                      </div>
                    )}
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
