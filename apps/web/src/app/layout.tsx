import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import EnvGuard from '../components/EnvGuard';
import AppProviders from '../components/providers/AppProviders';
import { Outfit, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

// Configure premium fonts
const fontBody = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
});

const fontHeading = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
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
  authors: [{ name: 'VeganGlow Team' }],
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
    <html lang="vi" suppressHydrationWarning className={`${fontBody.variable} ${fontHeading.variable}`} data-scroll-behavior="smooth">
      <body className="antialiased">
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
              fontFamily: 'var(--font-body)',
            },
          }}
        />
      </body>
    </html>
  );
}
