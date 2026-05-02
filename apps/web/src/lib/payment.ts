export type PaymentMethod = 'cod' | 'bank_transfer' | 'card';
export type NormalizedPaymentMethod = 'cod' | 'bank_transfer';

export const VEGANGLOW_BANK = {
  id: process.env.NEXT_PUBLIC_BANK_ID || 'MB',
  account: process.env.NEXT_PUBLIC_BANK_ACCOUNT || '2111122227777',
  name: process.env.NEXT_PUBLIC_BANK_NAME || 'PHAM HOAI THUONG',
};

export function normalizePaymentMethod(method: PaymentMethod): NormalizedPaymentMethod {
  return method === 'card' ? 'bank_transfer' : method;
}

export function isBankTransferMethod(method: string): boolean {
  return method === 'bank_transfer' || method === 'card';
}

export function bankTransferContent(orderCode: string): string {
  return `THANH TOAN DH ${orderCode}`;
}

export function buildVietQrUrl(amount: number, orderCode: string): string {
  const bank = encodeURIComponent(VEGANGLOW_BANK.id);
  const account = encodeURIComponent(VEGANGLOW_BANK.account);
  const content = encodeURIComponent(bankTransferContent(orderCode));
  const accountName = encodeURIComponent(VEGANGLOW_BANK.name);
  return `https://img.vietqr.io/image/${bank}-${account}-compact2.png?amount=${amount}&addInfo=${content}&accountName=${accountName}`;
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: 'Thanh toán khi nhận hàng',
  bank_transfer: 'Chuyển khoản ngân hàng',
  card: 'Chuyển khoản ngân hàng',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  pending: 'Chờ tiền vào tài khoản',
  paid: 'Đã nhận tiền',
  failed: 'Thanh toán thất bại',
  refunded: 'Đã hoàn tiền',
};
