import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import styles from '@/styles/Home.module.css';
import { Trash2, Plus, Minus } from 'lucide-react';

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();

  return (
    <>
      <Head>
        <title>Giỏ hàng | VeganGlow</title>
      </Head>

      <div className={styles.section}>
        <h1 style={{ marginBottom: '2rem' }}>Giỏ hàng của bạn</h1>

        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Giỏ hàng của bạn đang trống.</p>
            <Link href="/products" className="btn btn-primary">Tiếp tục mua sắm</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cartItems.map((item) => (
                <div key={item.id} className="card" style={{ padding: '1rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '80px', height: '100px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill style={{ objectFit: 'cover' }} />
                    ) : (
                      <div style={{ background: '#eee', height: '100%' }}></div>
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{item.name}</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{item.category}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.25rem' }}>
                    <button className="btn" style={{ padding: '0.25rem' }} onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                      <Minus size={14} />
                    </button>
                    <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: '600' }}>{item.quantity}</span>
                    <button className="btn" style={{ padding: '0.25rem' }} onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>

                  <div style={{ minWidth: '100px', textAlign: 'right' }}>
                    <p style={{ fontWeight: '700' }}>{(item.price * item.quantity).toLocaleString('vi-VN')}đ</p>
                  </div>

                  <button className="iconBtn" style={{ color: '#ff5f57' }} onClick={() => removeFromCart(item.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              
              <button 
                className="btn" 
                style={{ alignSelf: 'flex-start', color: 'var(--muted)', fontSize: '0.875rem', marginTop: '1rem' }}
                onClick={clearCart}
              >
                Xóa tất cả
              </button>
            </div>

            <div className="card" style={{ padding: '2rem', height: 'fit-content' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Tóm tắt đơn hàng</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--muted)' }}>
                <span>Tạm tính</span>
                <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', color: 'var(--muted)' }}>
                <span>Phí vận chuyển</span>
                <span>Miễn phí</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontWeight: '700', fontSize: '1.125rem' }}>Tổng cộng</span>
                <span style={{ fontWeight: '700', fontSize: '1.125rem', color: 'var(--primary)' }}>{totalAmount.toLocaleString('vi-VN')}đ</span>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} onClick={() => alert('Chức năng thanh toán đang được phát triển')}>
                Thanh toán ngay
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
