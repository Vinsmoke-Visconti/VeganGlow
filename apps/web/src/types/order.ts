import type { Database } from './database';

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export type OrderStatus = Order['status'];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao hàng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#F77F00',
  confirmed: '#457B9D',
  shipping: '#2D6A4F',
  completed: '#40916C',
  cancelled: '#D62828',
};
