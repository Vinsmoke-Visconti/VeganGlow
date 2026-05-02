import type { Metadata } from 'next';
import { Lora } from 'next/font/google';
import { Toaster } from 'sonner';
import EnvGuard from '../components/EnvGuard';
import AppProviders from '../components/providers/AppProviders';
import './globals.css';

const lora = Lora({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-lora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'VeganGlow — Mỹ phẩm thuần chay Việt Nam',
    template: '%s | VeganGlow',
  },
  description:
    'VeganGlow — Thương hiệu mỹ phẩm thuần chay Việt Nam, chiết xuất từ thiên nhiên cho làn da khỏe đẹp. Serum, toner, mặt nạ, chống nắng.',
  keywords: [
    'VeganGlow',
    'mỹ phẩm thuần chay',
    'skincare Việt Nam',
    'thiên nhiên',
    'serum',
    'toner',
  ],
  authors: [
    { name: 'Trần Thảo My' },
    { name: 'Huỳnh Nguyễn Quốc Việt' },
    { name: 'Phạm Hoài Thương' },
    { name: 'Trần Quỳnh Trâm' },
  ],
  creator: 'VeganGlow',
  publisher: 'VeganGlow',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${lora.variable} antialiased`}>
        <AppProviders>
          <EnvGuard>
            {children}
          </EnvGuard>
        </AppProviders>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'var(--font-lora)',
            },
          }}
        />
      </body>
    </html>
  );
}
