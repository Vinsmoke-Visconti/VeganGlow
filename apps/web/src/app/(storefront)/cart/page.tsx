'use client';

import { useCart } from '@/context/CartContext';
import { normalizeProductImage } from '@/lib/imageUrl';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, totalAmount, totalCount, clearCart } =
    useCart();

  if (cartItems.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '60vh',
          padding: '80px 24px',
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
          className="bg-primary/5 text-primary"
        >
          <ShoppingBag size={32} />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 12 }}
          className="font-serif text-3xl lg:text-5xl font-medium tracking-tight text-text"
        >
          Giỏ hàng đang trống
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          style={{ maxWidth: 420, textAlign: 'center', marginBottom: 32 }}
          className="text-text-secondary leading-relaxed"
        >
          Có vẻ như bạn chưa thêm sản phẩm nào vào giỏ hàng.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Link
            href="/products"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-text text-white text-sm font-medium hover:bg-primary-dark transition"
          >
            Tiếp tục mua sắm
            <ArrowRight size={16} className="ml-1.5" />
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  /* ── Có sản phẩm ── */
  const handleClearCart = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) {
      clearCart();
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px 80px' }}>
      {/* ─── Header ─── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ marginBottom: 40 }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-primary block mb-2">
              Giỏ hàng
            </span>
            <h1 className="font-serif text-3xl lg:text-4xl font-medium tracking-tight text-text">
              Giỏ hàng của bạn
            </h1>
            <p className="mt-2 text-text-secondary text-sm">
              {totalCount} sản phẩm đang chờ thanh toán.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearCart}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-border bg-white text-sm text-text-secondary hover:border-error hover:text-error transition"
          >
            <Trash2 size={14} /> Xóa tất cả
          </button>
        </div>
      </motion.header>

      {/* ─── Body: 2 cột ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">
        {/* ─── Cột trái: Danh sách sản phẩm ─── */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <AnimatePresence mode="popLayout">
            {cartItems.map((item) => {
              const img = normalizeProductImage(item.image);
              const subtotal = item.price * item.quantity;
              return (
                <motion.article
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: 20,
                    padding: 20,
                    borderRadius: 16,
                    border: '1px solid #e8e5e0',
                    backgroundColor: '#fff',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  {/* Ảnh sản phẩm — 120px */}
                  <Link
                    href={`/products/${item.slug || item.id}`}
                    style={{
                      display: 'block',
                      width: 120,
                      height: 120,
                      borderRadius: 12,
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: '#f5f3ef',
                      border: '1px solid #e8e5e0',
                    }}
                  >
                    {img ? (
                      <Image
                        src={img}
                        alt={item.name}
                        width={140}
                        height={140}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        className="font-serif text-3xl text-primary/30"
                      >
                        {item.name.charAt(0)}
                      </div>
                    )}
                  </Link>

                  {/* Thông tin + giá + số lượng */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/products/${item.slug || item.id}`}
                      className="font-serif text-base lg:text-lg leading-snug text-text hover:text-primary transition line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-primary font-semibold mt-1">
                      {formatVND(item.price)}
                    </p>

                    {/* Hàng: Số lượng + Thành tiền */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        marginTop: 16,
                        paddingTop: 16,
                        borderTop: '1px solid #f0ede8',
                      }}
                    >
                      {/* Quantity picker */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: 44,
                          borderRadius: 9999,
                          border: '1px solid #e8e5e0',
                          backgroundColor: '#faf9f7',
                        }}
                      >
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
                          style={{
                            width: 44,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            border: 'none',
                            background: 'transparent',
                          }}
                          className="hover:bg-primary/10 transition-colors text-text-secondary"
                          aria-label="Giảm số lượng"
                        >
                          <Minus size={16} />
                        </button>
                        <span
                          style={{
                            minWidth: 40,
                            textAlign: 'center',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                          className="font-serif text-base font-semibold text-text"
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{
                            width: 44,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            border: 'none',
                            background: 'transparent',
                          }}
                          className="hover:bg-primary/10 transition-colors text-text-secondary"
                          aria-label="Tăng số lượng"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {/* Thành tiền */}
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}
                          className="text-text-muted font-semibold block mb-0.5"
                        >
                          Thành tiền
                        </span>
                        <span className="font-serif text-lg lg:text-xl font-bold text-text tabular-nums">
                          {formatVND(subtotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nút xóa */}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Xóa "${item.name}" khỏi giỏ hàng?`)) {
                        removeFromCart(item.id);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: '1px solid #e8e5e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                    className="text-text-muted hover:text-error hover:border-error transition-colors"
                    aria-label="Xóa sản phẩm"
                  >
                    <Trash2 size={15} />
                  </button>
                </motion.article>
              );
            })}
          </AnimatePresence>

          <Link
            href="/products"
            className="inline-flex items-center gap-2 mt-4 text-sm text-text-secondary hover:text-text transition"
          >
            <ArrowLeft size={16} /> Tiếp tục mua sắm
          </Link>
        </motion.section>

        {/* ─── Cột phải: Tóm tắt đơn hàng ─── */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="lg:sticky lg:top-24"
        >
          <div
            style={{
              borderRadius: 20,
              border: '1px solid #e8e5e0',
              padding: '28px 24px',
              backgroundColor: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            <h2
              style={{ marginBottom: 24 }}
              className="font-serif text-2xl font-medium tracking-tight text-text"
            >
              Tóm tắt đơn hàng
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}
                className="text-text-secondary"
              >
                <span>Tạm tính ({totalCount} sản phẩm)</span>
                <span className="text-text font-medium tabular-nums">{formatVND(totalAmount)}</span>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}
                className="text-text-secondary"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Truck size={14} /> Phí vận chuyển
                </span>
                <span className="text-success font-medium">Miễn phí</span>
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid #f0ede8',
                marginTop: 20,
                paddingTop: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span className="font-serif text-base text-text">Tổng cộng</span>
              <div style={{ textAlign: 'right' }}>
                <div className="font-serif text-2xl lg:text-3xl font-bold text-text tabular-nums">
                  {formatVND(totalAmount)}
                </div>
                <div style={{ fontSize: 11 }} className="text-text-muted">
                  Đã bao gồm VAT
                </div>
              </div>
            </div>

            <Link
              href="/checkout"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 48,
                borderRadius: 9999,
                marginTop: 24,
                textDecoration: 'none',
              }}
              className="bg-text text-white font-medium tracking-tight hover:bg-primary-dark transition"
            >
              Thanh toán ngay
            </Link>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 16,
                fontSize: 12,
              }}
              className="text-text-muted"
            >
              <ShieldCheck size={14} className="text-primary" />
              <span>Mua sắm an toàn — đổi trả trong 7 ngày</span>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
