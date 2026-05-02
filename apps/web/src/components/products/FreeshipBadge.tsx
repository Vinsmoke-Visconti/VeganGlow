import { Truck } from 'lucide-react';
import styles from './FreeshipBadge.module.css';

type Props = {
  threshold: number;
  currentPrice?: number;
};

function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export default function FreeshipBadge({ threshold, currentPrice }: Props) {
  const eligible = typeof currentPrice === 'number' && currentPrice >= threshold;
  return (
    <span className={`${styles.badge} ${eligible ? styles.badgeActive : ''}`}>
      <Truck size={14} />
      {eligible
        ? 'Freeship đơn này'
        : `Freeship cho đơn từ ${formatVND(threshold)}`}
    </span>
  );
}
