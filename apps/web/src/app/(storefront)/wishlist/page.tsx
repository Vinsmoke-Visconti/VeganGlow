'use client';

import { useState, useEffect } from 'react';
import { Heart, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductCard, { type ProductCardProduct } from '@/components/products/ProductCard';
import { createBrowserClient } from '@/lib/supabase/client';

type FavoriteRow = {
  product_id: string;
  products: ProductCardProduct | null;
};

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<ProductCardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = createBrowserClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (!user) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      setAuthed(true);

      const { data, error } = await supabase
        .from('favorites')
        .select('product_id, products(*)')
        .eq('user_id', user.id);

      if (!alive) return;

      if (!error && data) {
        const products = (data as unknown as FavoriteRow[])
          .map((r) => r.products)
          .filter((p): p is ProductCardProduct => Boolean(p));
        setWishlist(products);
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const removeFromWishlist = async (productId: string) => {
    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const prev = wishlist;
    setWishlist((items) => items.filter((p) => p.id !== productId));

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) setWishlist(prev);
  };

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-24 text-center">
        <div className="inline-grid place-items-center w-12 h-12 rounded-full border border-border-light animate-pulse">
          <Heart size={20} className="text-text-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-12 lg:py-20">
      <header className="text-center max-w-2xl mx-auto mb-10 lg:mb-16">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-primary mb-4">
          <Heart size={14} /> Bộ sưu tập riêng của bạn
        </span>
        <h1 className="font-serif text-4xl lg:text-6xl font-medium tracking-tight text-text">
          Danh sách yêu thích
        </h1>
        <p className="mt-4 text-text-secondary leading-relaxed">
          Lưu lại những sản phẩm bạn yêu quý để mua sau.
        </p>
      </header>

      {authed === false ? (
        <EmptyState
          icon={<Heart size={32} />}
          title="Bạn chưa đăng nhập"
          description="Đăng nhập để lưu danh sách yêu thích trên mọi thiết bị."
          action={{
            label: 'Đăng nhập',
            onClick: () => router.push(`/login?redirectTo=${encodeURIComponent('/wishlist')}`),
          }}
        />
      ) : wishlist.length === 0 ? (
        <EmptyState
          icon={<Heart size={32} />}
          title="Chưa có sản phẩm yêu thích"
          description="Hãy dạo quanh cửa hàng và nhấn vào biểu tượng trái tim để lưu lại những món đồ bạn ưng ý."
          action={{ label: 'Tiếp tục mua sắm', href: '/products' }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-text-secondary">
              <span className="font-medium text-text">{wishlist.length}</span> sản phẩm
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {wishlist.map((product) => (
              <div key={product.id} className="relative group">
                <ProductCard product={product} />
                <button
                  type="button"
                  onClick={() => removeFromWishlist(product.id)}
                  className="absolute top-3 left-3 grid place-items-center w-9 h-9 rounded-full bg-white/85 backdrop-blur text-error opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                  title="Xóa khỏi danh sách"
                  aria-label="Xóa khỏi danh sách yêu thích"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: { label: string; href?: string; onClick?: () => void };
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const cta = (
    <>
      {action.label}
      <ArrowRight size={16} className="ml-1.5" />
    </>
  );
  return (
    <div className="text-center py-16 lg:py-24">
      <div className="inline-grid place-items-center w-20 h-20 rounded-full bg-primary-50 text-primary mb-6">
        {icon}
      </div>
      <h3 className="font-serif text-2xl lg:text-3xl font-medium text-text mb-3">{title}</h3>
      <p className="text-text-secondary max-w-md mx-auto mb-8 leading-relaxed">{description}</p>
      {action.href ? (
        <Link
          href={action.href}
          className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition"
        >
          {cta}
        </Link>
      ) : (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition"
        >
          {cta}
        </button>
      )}
    </div>
  );
}
