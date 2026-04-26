'use client';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from 'lucide-react';
import styles from './cart.module.css';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, totalAmount, totalCount } = useCart();

  if (cartItems.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.emptyContainer}
      >
        <div className={styles.emptyIcon}>
          <ShoppingBag size={64} />
        </div>
        <h1>Giỏ hàng của bạn đang trống</h1>
        <p>Có vẻ như bạn chưa thêm sản phẩm nào vào giỏ hàng.</p>
        <Link href="/products" className={styles.continueBtn}>
          Tiếp tục mua sắm
        </Link>
      </motion.div>
    );
  }

  return (
    <div className={styles.container}>
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.header}
      >
        <h1 className={styles.title}>Giỏ hàng của bạn ({totalCount} sản phẩm)</h1>
      </motion.header>

      <div className={styles.content}>
        {/* Cart Items List */}
        <div className={styles.itemsSection}>
          <AnimatePresence>
            {cartItems.map((item, index) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ delay: index * 0.1 }}
                className={styles.cartItem}
              >
                <div className={styles.itemImage}>
                  <img src={item.image} alt={item.name} />
                </div>
                <div className={styles.itemInfo}>
                  <Link href={`/products/${item.id}`} className={styles.itemName}>
                    {item.name}
                  </Link>
                  <div className={styles.itemPrice}>
                    {item.price.toLocaleString('vi-VN')}đ
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <div className={styles.quantityControls}>
                    <button 
                      onClick={() => {
                        if (item.quantity === 1) {
                          if (window.confirm(`Bạn có chắc chắn muốn xóa "${item.name}" khỏi giỏ hàng?`)) {
                            removeFromCart(item.id);
                          }
                        } else {
                          updateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                      className={styles.qtyBtn}
                    >
                      <Minus size={16} />
                    </button>
                    <span className={styles.quantity}>{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className={styles.qtyBtn}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Xóa "${item.name}" khỏi giỏ hàng?`)) {
                        removeFromCart(item.id);
                      }
                    }}
                    className={styles.removeBtn}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <div className={styles.itemTotal}>
                  {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <Link href="/products" className={styles.backLink}>
              <ArrowLeft size={18} /> Tiếp tục mua sắm
            </Link>
          </motion.div>
        </div>

        {/* Order Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={styles.summarySection}
        >
          <div className={styles.summaryCard}>
            <h2>Tóm tắt đơn hàng</h2>
            <div className={styles.summaryRow}>
              <span>Tạm tính</span>
              <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Phí vận chuyển</span>
              <span>Miễn phí</span>
            </div>
            <div className={styles.summaryDivider}></div>
            <div className={styles.totalRow}>
              <span>Tổng cộng</span>
              <span className={styles.totalPrice}>{totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>
            <p className={styles.taxNote}>(Đã bao gồm VAT nếu có)</p>
            
            <Link href="/checkout" className={styles.checkoutBtn}>
              Thanh toán ngay
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
