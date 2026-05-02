'use client';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import {
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ShoppingBag,
  ShieldCheck,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { normalizeProductImage } from '@/lib/imageUrl';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, totalAmount, totalCount, clearCart } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-16 lg:py-24 text-center">
        <div className="inline-grid place-items-center w-20 h-20 rounded-full bg-primary-50 text-primary mb-6">
          <ShoppingBag size={32} />
        </div>
        <h1 className="font-serif text-3xl lg:text-5xl font-medium tracking-tight text-text mb-3">
          Giỏ hàng đang trống
        </h1>
        <p className="text-text-secondary max-w-md mx-auto mb-8 leading-relaxed">
          Có vẻ như bạn chưa thêm sản phẩm nào vào giỏ hàng.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition"
        >
          Tiếp tục mua sắm
          <ArrowRight size={16} className="ml-1.5" />
        </Link>
      </div>
    );
  }

  const handleClearCart = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) {
      clearCart();
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-12 lg:py-20">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-primary mb-2 block">Giỏ hàng</span>
          <h1 className="font-serif text-3xl lg:text-5xl font-medium tracking-tight text-text">
            Giỏ hàng của bạn
          </h1>
          <p className="mt-2 text-text-secondary">{totalCount} sản phẩm đang chờ thanh toán.</p>
        </div>
        <button
          type="button"
          onClick={handleClearCart}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border bg-white text-sm text-text-secondary hover:border-error hover:text-error transition"
        >
          <Trash2 size={14} /> Xóa tất cả
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 items-start">
        {/* Items column */}
        <section className="flex flex-col gap-3">
          <div className="hidden lg:grid grid-cols-[1fr_120px_120px_40px] gap-4 px-4 pb-3 text-[11px] uppercase tracking-[0.18em] text-text-muted border-b border-border-light">
            <span>Sản phẩm</span>
            <span className="text-center">Số lượng</span>
            <span className="text-right">Tạm tính</span>
            <span />
          </div>

          {cartItems.map((item) => {
            const img = normalizeProductImage(item.image);
            const subtotal = item.price * item.quantity;
            return (
              <article
                key={item.id}
                className="grid grid-cols-[88px_1fr] lg:grid-cols-[1fr_120px_120px_40px] gap-4 lg:gap-6 items-center p-4 rounded-2xl bg-bg-card border border-border-light"
              >
                {/* Product (image + name + price) */}
                <div className="flex items-center gap-4 col-span-1 lg:col-span-1 row-span-2 lg:row-span-1 lg:contents">
                  <Link
                    href={`/products/${item.slug || item.id}`}
                    className="block shrink-0 w-22 h-22 lg:w-24 lg:h-24 rounded-xl overflow-hidden bg-primary-50"
                    style={{ width: 88, height: 88 }}
                  >
                    {img ? (
                      <Image
                        src={img}
                        alt={item.name}
                        width={120}
                        height={120}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="grid place-items-center h-full font-serif text-3xl text-primary">
                        {item.name.charAt(0)}
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-col gap-1 lg:py-2 min-w-0">
                    <Link
                      href={`/products/${item.slug || item.id}`}
                      className="font-serif text-base lg:text-lg leading-snug text-text line-clamp-2 hover:text-primary transition"
                    >
                      {item.name}
                    </Link>
                    <span className="text-sm text-text-muted">{formatVND(item.price)}</span>
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-center">
                  <div className="inline-flex items-center h-10 rounded-full border border-border bg-white">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.quantity === 1) {
                          if (window.confirm(`Xóa "${item.name}" khỏi giỏ hàng?`)) {
                            removeFromCart(item.id);
                          }
                        } else {
                          updateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                      className="w-10 h-10 grid place-items-center rounded-l-full hover:bg-primary-50"
                      aria-label="Giảm số lượng"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[2.5rem] text-center font-serif text-sm tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-10 h-10 grid place-items-center rounded-r-full hover:bg-primary-50"
                      aria-label="Tăng số lượng"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="font-serif text-base lg:text-lg font-semibold text-text text-right">
                  {formatVND(subtotal)}
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Xóa "${item.name}" khỏi giỏ hàng?`)) {
                      removeFromCart(item.id);
                    }
                  }}
                  className="grid place-items-center w-10 h-10 rounded-full text-text-muted hover:text-error hover:bg-primary-50 transition justify-self-end"
                  aria-label="Xóa sản phẩm"
                >
                  <Trash2 size={16} />
                </button>
              </article>
            );
          })}

          <Link
            href="/products"
            className="inline-flex items-center gap-2 mt-4 text-sm text-text-secondary hover:text-text"
          >
            <ArrowLeft size={16} /> Tiếp tục mua sắm
          </Link>
        </section>

        {/* Summary column */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl bg-bg-card border border-border-light p-6 lg:p-8 flex flex-col gap-5">
            <h2 className="font-serif text-2xl font-medium tracking-tight text-text">
              Tóm tắt đơn hàng
            </h2>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between text-text-secondary">
                <span>Tạm tính ({totalCount} sản phẩm)</span>
                <span className="text-text font-medium">{formatVND(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Truck size={14} /> Phí vận chuyển
                </span>
                <span className="text-success font-medium">Miễn phí</span>
              </div>
            </div>

            <div className="border-t border-border-light pt-4 flex items-center justify-between">
              <span className="font-serif text-lg text-text">Tổng cộng</span>
              <div className="text-right">
                <div className="font-serif text-2xl lg:text-3xl font-semibold text-text">
                  {formatVND(totalAmount)}
                </div>
                <div className="text-[11px] text-text-muted">Đã bao gồm VAT</div>
              </div>
            </div>

            <Link
              href="/checkout"
              className="inline-flex items-center justify-center h-12 rounded-full bg-text text-white font-medium tracking-tight hover:bg-primary-dark transition"
            >
              Thanh toán ngay
            </Link>

            <div className="flex items-center gap-2 text-xs text-text-muted">
              <ShieldCheck size={14} className="text-primary" />
              <span>Mua sắm an toàn — đổi trả trong 7 ngày</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
