export const APP_NAME = 'VeganGlow';
export const APP_DESCRIPTION = 'Mỹ phẩm thuần chay Việt Nam — Thiên nhiên cho làn da khỏe đẹp';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const PRODUCTS_PER_PAGE = 12;

export const NAV_LINKS = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Sản phẩm', href: '/products' },
  { label: 'Về chúng tôi', href: '/about' },
  { label: 'Blog', href: '/blog' },
] as const;

export const FOOTER_LINKS = {
  company: [
    { label: 'Giới thiệu', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Tuyển dụng', href: '/careers' },
    { label: 'Liên hệ', href: '/contact' },
  ],
  support: [
    { label: 'Hướng dẫn mua hàng', href: '/guide' },
    { label: 'Chính sách đổi trả', href: '/return-policy' },
    { label: 'Chính sách bảo mật', href: '/privacy' },
    { label: 'Điều khoản sử dụng', href: '/terms' },
  ],
  categories: [
    { label: 'Serum', href: '/products?category=serum' },
    { label: 'Toner', href: '/products?category=toner' },
    { label: 'Mặt nạ', href: '/products?category=mat-na' },
    { label: 'Chống nắng', href: '/products?category=chong-nang' },
  ],
} as const;

export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com/veganglow',
  instagram: 'https://instagram.com/veganglow',
  tiktok: 'https://tiktok.com/@veganglow',
  youtube: 'https://youtube.com/@veganglow',
} as const;
