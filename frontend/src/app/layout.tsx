import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'VeganGlow — Mỹ phẩm thuần chay Việt Nam',
    template: '%s | VeganGlow',
  },
  description:
    'VeganGlow — Thương hiệu mỹ phẩm thuần chay Việt Nam, chiết xuất từ thiên nhiên cho làn da khỏe đẹp. Serum, toner, mặt nạ, chống nắng.',
  keywords: [
    'mỹ phẩm thuần chay',
    'vegan cosmetics',
    'skincare',
    'VeganGlow',
    'mỹ phẩm thiên nhiên',
    'serum rau má',
    'chống nắng trà xanh',
  ],
  authors: [{ name: 'VeganGlow Team' }],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://veganglow.vn',
    siteName: 'VeganGlow',
    title: 'VeganGlow — Mỹ phẩm thuần chay Việt Nam',
    description:
      'Thương hiệu mỹ phẩm thuần chay chiết xuất thiên nhiên Việt Nam',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VeganGlow — Mỹ phẩm thuần chay Việt Nam',
    description:
      'Thương hiệu mỹ phẩm thuần chay chiết xuất thiên nhiên Việt Nam',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'var(--font-body)',
            },
          }}
        />
      </body>
    </html>
  );
}
