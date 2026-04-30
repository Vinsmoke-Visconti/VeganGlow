export function formatVND(value: number | string | null | undefined): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function formatDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateShort(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatRelative(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.round(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.round(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.round(diff / 86400)} ngày trước`;
  return formatDateShort(d);
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: 'badgePending',
  confirmed: 'badgeShipping',
  shipping: 'badgeShipping',
  completed: 'badgeSuccess',
  cancelled: 'badgeDanger',
};

export const PAYMENT_LABEL: Record<string, string> = {
  cod: 'COD',
  card: 'Chuyển khoản',
  bank_transfer: 'Chuyển khoản',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  pending: 'Chờ tiền vào',
  paid: 'Đã nhận tiền',
  failed: 'Thanh toán lỗi',
  refunded: 'Đã hoàn tiền',
};

export const PAYMENT_STATUS_BADGE: Record<string, string> = {
  unpaid: 'badgeMuted',
  pending: 'badgePending',
  paid: 'badgeSuccess',
  failed: 'badgeDanger',
  refunded: 'badgeMuted',
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
