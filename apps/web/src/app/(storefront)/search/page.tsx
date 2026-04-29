'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, ArrowRight, Frown } from 'lucide-react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import styles from './search.module.css';
import ProductCard from '@/components/products/ProductCard';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createBrowserClient();

  const handleSearch = async (q: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .eq('is_active', true);

    if (!error) {
      setResults(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (query) {
      handleSearch(query);
    } else {
      setResults([]);
    }
  }, [query]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <form onSubmit={onSearchSubmit} className={styles.searchBar}>
          <Search size={22} className={styles.searchIcon} />
          <input 
            type="text" 
            className={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        {query && (
          <div className={styles.queryInfo}>
            <h1 className={styles.queryTitle}>Kết quả cho &ldquo;{query}&rdquo;</h1>
            <p className={styles.resultCount}>Tìm thấy <span>{results.length}</span> sản phẩm phù hợp</p>
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '4rem' }}
          >
            <Loader2 className="animate-spin" size={48} color="var(--color-primary)" style={{ margin: '0 auto' }} />
          </motion.div>
        ) : query && results.length === 0 ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={styles.emptyState}
          >
            <div className={styles.emptyIcon}>
              <Frown size={40} />
            </div>
            <h3 className={styles.emptyTitle}>Rất tiếc, không tìm thấy kết quả</h3>
            <p className={styles.emptyText}>
              Chúng tôi không tìm thấy sản phẩm nào khớp với từ khóa của bạn. Hãy thử lại với từ khóa khác hoặc tham khảo các gợi ý dưới đây.
            </p>
            
            <span className={styles.suggestionTitle}>Gợi ý cho bạn</span>
            <div className={styles.suggestions}>
              {['Rau má', 'Trà xanh', 'Serum', 'Kem chống nắng', 'Toner'].map(s => (
                <Link key={s} href={`/search?q=${s}`} className={styles.suggestionLink}>
                  {s}
                </Link>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.grid}
          >
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
