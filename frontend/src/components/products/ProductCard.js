import Link from 'next/link';
import Image from 'next/image';
import styles from './Product.module.css';
import { useCart } from '@/context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  return (
    <div className={`card ${styles.card}`}>
      <Link href={`/products/${product.id}`} className={styles.imageWrapper}>
        {product.image_url ? (
          <Image 
            src={product.image_url} 
            alt={product.name} 
            fill 
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className={styles.placeholder}>{product.name} Image</div>
        )}
      </Link>
      
      <div className={styles.content}>
        <span className={styles.category}>{product.category}</span>
        <Link href={`/products/${product.id}`}>
          <h3 className={styles.name}>{product.name}</h3>
        </Link>
        <div className={styles.footer}>
          <span className={styles.price}>{product.price.toLocaleString('vi-VN')}đ</span>
          <button 
            className="btn btn-primary" 
            aria-label="Add to cart"
            onClick={() => addToCart(product)}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
